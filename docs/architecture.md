# JobTrack 시스템 아키텍처 설계서 (Architecture)

> **문서 관리 규칙**
> - **기술적 의사결정 기록**: 모든 아키텍처 설계, 기술 스택 선정 근거, 데이터 흐름은 본 문서에 기록한다.
> - **참조 문서**: 비즈니스 요구사항은 `docs/prd.md`를 참조한다.
- **기능별 상세 설계**: 상세 비즈니스 플로우 및 데이터 흐름은 `docs/features/*.md`를 참조한다.
---

## 1. 아키텍처 전략 (Architecture Strategy)

### 1.1 계층형 아키텍처 (Layered Architecture)
- **구조**: `Controller (Route Handlers / Server Components) -> Service -> Repository -> DB`
- **목적**: 의존성 역전 원칙(DIP)을 적용하여 도메인 로직을 인프라(Supabase SDK 등)로부터 분리한다. 
- **Rationale**: 향후 DB 교체나 프레임워크 전환(NestJS 등) 시 비즈니스 로직 수정을 최소화하기 위함이다.
- **레이어 규칙 (예외 없음)**:
  - **Controller** (Route Handler / Server Component): HTTP 요청/응답 처리, 인증 검증, 입력 유효성 검사. 비즈니스 로직 포함 금지.
  - **Service** (class 기반): 비즈니스 로직 캡슐화. Repository 인터페이스를 생성자 주입(Constructor Injection)으로 받는다.
  - **Repository Interface** (`domain/repositories/`): Supabase 비종속적인 도메인 언어로 정의된 데이터 접근 계약.
  - **Repository Implementation** (`infrastructure/repositories/`): Supabase SDK를 사용한 구체 구현체.
- **DI 전략 (Domain-specific Container)**:
  - 도메인별 컨테이너 팩토리 함수(`containers/`)가 Supabase 클라이언트 생성 → Repository 인스턴스화 → Service 인스턴스화를 수행한다.
  - Controller에서 `const { applicationService } = createApplicationContainer()` 형태로 사용하여 보일러플레이트를 최소화한다.
- **에러 처리**:
  - `AppError` 경량 에러 클래스(`domain/errors.ts`)로 도메인 에러를 표현한다.
  - Controller에서 `toErrorResponse(error)` 헬퍼(`api/response.ts`)를 통해 AppError를 HTTP 응답으로 변환한다.
#### 코드 예제: 지원서 목록 조회 플로우

> `GET /api/applications` 요청이 각 레이어를 통과하는 과정을 실제 코드에서 발췌하여 보여준다.

**1. Controller** (`app/api/applications/route.ts`) — HTTP 관심사만 처리:

```typescript
export async function GET(request: NextRequest) {
  const auth = requireAuth(request);              // 인증 검증
  if (auth.ok === false) return auth.response;

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const queryParsed = applicationsListQuerySchema.safeParse(params);  // 입력 검증
  if (!queryParsed.success) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  const { applicationService } = createApplicationContainer();  // DI Container

  try {
    const data = await applicationService.list(auth.payload.sub, {  // Service 호출
      stage: queryParsed.data.stage,
      search: queryParsed.data.search,
    });
    return NextResponse.json({ applications: data });
  } catch (error) {
    return toErrorResponse(error);  // AppError → HTTP 응답 변환
  }
}
```

**2. Service** (`lib/services/ApplicationService.ts`) — 비즈니스 로직 캡슐화:

```typescript
export class ApplicationService {
  constructor(
    private readonly applicationRepo: IApplicationRepository,  // Interface 의존
    private readonly eventRepo: IEventRepository,
  ) {}

  async list(
    userId: string,
    params?: { stage?: StageType; search?: string },
  ): Promise<ApplicationRow[]> {
    return this.applicationRepo.findMany(userId, params);  // Repository 호출
  }
}
```

**3. Repository Interface** (`lib/domain/repositories/application.repository.ts`) — DB 비종속 계약:

```typescript
export interface IApplicationRepository {
  findMany(
    userId: string,
    params?: { stage?: StageType; search?: string },
  ): Promise<ApplicationRow[]>;
  findById(id: string, userId: string): Promise<ApplicationRow | null>;
  existsForUser(id: string, userId: string): Promise<boolean>;
  create(userId: string, input: CreateApplicationInput): Promise<ApplicationRow>;
  update(id: string, userId: string, input: UpdateApplicationInput): Promise<ApplicationRow>;
  remove(id: string, userId: string): Promise<void>;
}
```

**4. Repository Implementation** (`lib/infrastructure/repositories/SupabaseApplicationRepository.ts`) — Supabase 구체 구현:

```typescript
export class SupabaseApplicationRepository implements IApplicationRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findMany(
    userId: string,
    params?: { stage?: StageType; search?: string },
  ): Promise<ApplicationRow[]> {
    let query = this.supabase
      .from("applications")
      .select("*")
      .eq("user_id", userId)  // 소유권 필터 강제
      .order("created_at", { ascending: false });

    if (params?.stage) query = query.eq("current_stage", params.stage);
    if (params?.search) {
      query = query.or(
        `company_name.ilike.%${params.search}%,position.ilike.%${params.search}%`,
      );
    }

    const { data, error } = await query.returns<ApplicationRow[]>();
    if (error) throw error;
    return data ?? [];
  }
}
```

**5. Container** (`lib/containers/application.container.ts`) — DI 조립:

```typescript
export function createApplicationContainer() {
  const supabase = createServerSupabaseClient();
  const applicationRepo = new SupabaseApplicationRepository(supabase);
  const eventRepo = new SupabaseEventRepository(supabase);

  return {
    applicationService: new ApplicationService(applicationRepo, eventRepo),
    eventService: new EventService(eventRepo, applicationRepo),
  };
}
```

### 1.2 BFF (Backend For Frontend) 패턴
- **구조**: Next.js API Routes를 클라이언트와 데이터베이스 사이의 중계 레이어로 활용한다.
- **Rationale**: 보안(Secret 관리) 및 데이터 가공 로직을 서버측에 집중시켜 클라이언트의 복잡도를 낮추고 일관된 API 계약을 유지한다.

---

## 2. 기술 스택 및 선정 근거 (Tech Stack)

| 분류 | 기술 | 선정 근거 (Rationale) |
| :--- | :--- | :--- |
| **Frontend** | Next.js 16 (App Router) | Server Components를 통한 성능 최적화 및 풀스택 개발 효율성. |
| **State** | TanStack Query | 서버 데이터 캐싱/동기화 체계화 및 로딩 UX 개선. server components와 역할 분리 |
| **Backend** | Next.js API Routes | BFF 패턴 구현 및 Vercel 인프라 최적 활용. |
| **Database** | Supabase (Postgres) | 통합 인프라 제공을 통한 초기 개발 속도 확보. |
| **Auth** | Custom JWT / Supabase Auth (V2) | 인증 원리 학습 후 관리형 서비스로의 단계적 전환. |
| **Styling** | Tailwind CSS 4 | CSS 변수 기반 테마 확장 및 빠른 UI 개발. |

---

## 3. 코드베이스 구조 (Codebase Structure)

```text
src/
├── app/                  # Next.js App Router (Pages & API Routes)
│   ├── api/              # BFF API Routes (Controller 역할)
│   └── (routes)/         # UI Pages (Server Components = Read-only Controller)
├── components/           # UI Components
│   ├── ui/               # shadcn/ui 원자 컴포넌트
│   └── app/              # 도메인 특정 컴포넌트
├── lib/                  # 핵심 로직 및 유틸리티
│   ├── api/              # HTTP 응답 헬퍼 (toErrorResponse 등)
│   ├── auth/             # 인증 및 보안 (JWT, 세션)
│   ├── containers/       # 도메인별 DI 컨테이너 팩토리
│   ├── domain/           # 도메인 계층
│   │   ├── errors.ts     # AppError 경량 에러 클래스
│   │   └── repositories/ # Repository 인터페이스 (Supabase 비종속)
│   ├── infrastructure/   # 인프라 계층
│   │   └── repositories/ # Supabase Repository 구현체
│   ├── services/         # 비즈니스 로직 (class 기반 Service)
│   ├── supabase/         # DB 클라이언트 및 생성 타입
│   └── validation/       # Zod 기반 요청 검증
└── types/                # 공용 타입 정의
```

---

## 4. 데이터 아키텍처 (Data Architecture)

### 4.1 데이터 흐름
- **Read**: Page (Server Component) -> Service -> Repository -> Supabase
- **Write**: Client Component (React Query) -> API Route (BFF) -> Service -> Repository -> Supabase

### 4.2 데이터베이스 상세 설계 (Relational Design)

| 테이블 | 컬럼 (핵심) | 제약 조건 및 관계 |
| :--- | :--- | :--- |
| **users** | `id`, `email`, `password_hash` | `email`: UNIQUE / PK: `id` |
| **applications** | `id`, `user_id`, `company_name` | FK: `user_id` → `users.id` (Cascade) |
| **events** | `id`, `application_id`, `event_type` | FK: `application_id` → `applications.id` (Cascade) |
| **documents** | `id`, `application_id`, `file_url` | FK: `application_id` → `applications.id` (Cascade) |

> **Note**: Cascade behavior (ON DELETE CASCADE) 및 Unique 제약 조건은 Supabase Dashboard에서 설정하며, 코드베이스의 `database.generated.ts`에 반영되어 있다.

---

## 5. 인증 및 보안 (Auth & Security)

### 5.1 토큰 및 세션 전략 (Token Strategy)

- **Access Token**: JWT 기반 (유효기간: 7일).
  - `jsonwebtoken` 라이브러리를 통해 서버에서 직접 발급 및 검증 (`lib/auth/jwt.ts`).
  - `expiresIn: "7d"` 설정을 통해 수명을 관리하며, HttpOnly 쿠키(`jobtrack_auth`)에 저장.
- **Refresh Token**: 현재 미사용 (보안 및 구현 단순화).
- **만료 처리 및 재시도 (Expiration & Retry)**:
  - **만료 시**: 서버는 `401 Unauthorized`를 반환(verifyAuthToken 실패 시).
  - **클라이언트 대응**: API 응답에서 401 에러 감지 시, 클라이언트 사이드에서 사용자를 `/auth` 페이지로 리다이렉트하여 재로그인을 유도한다.

### 5.2 보안 원칙
- API Route 접근 시 반드시 JWT 세션 검증 (`requireAuth` 미들웨어).
- 모든 리소스 접근 시 `user_id`를 통한 소유권 검증 필수 (Repository 레벨에서 userId 조건 강제).

---

## 6. API 설계 및 운영 (API Design)

### 6.1 설계 원칙
- **RESTful API**: 리소스 중심의 엔드포인트 설계.
- **응답 규격**: 에러 코드와 메시지를 포함한 표준 JSON 응답 포맷 준수.
- **문서화**: API 변경 시 `public/openapi.json` 업데이트 및 Swagger(` /swagger`) 동기화.

---

## 7. 인프라 및 운영 (Infrastructure)

### 7.1 스케줄링 및 웹훅
- **Cron**: Vercel Cron을 사용한 일일 리마인더 배치 작업 실행.
- **Webhook**: Resend 이메일 발송 상태 수신 및 Svix를 통한 웹훅 검증.

---

## 8. 로드맵 (Technical Roadmap)

- **[V2-DONE] Repository 패턴 도입**: interface 기반 Repository + class 기반 Service + 도메인별 Container로 3계층 아키텍처 완성.
- **[V2-DONE] 알림 서비스 독립화**: NotificationService 추출 완료. 단위 테스트 강화는 추후 진행.
- **[V2-PLANNED] Auth 추상화**: `IAuthService` 도입 및 Supabase Auth 마이그레이션.
