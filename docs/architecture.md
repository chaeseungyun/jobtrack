# JobTrack 시스템 아키텍처 설계서 (Architecture)

> **문서 역할**: 시스템의 전체적인 구조, 레이어링 원칙, 데이터 흐름, 보안 전략 등 프로젝트의 "뼈대"를 정의합니다.
> **작성 가이드**: 
> - 새로운 아키텍처 패턴 도입 시 업데이트
> - 전역적으로 적용되는 명명 규칙이나 폴더 구조 변경 시 반영
> - 비즈니스 로직과 인프라 간의 계약(Interface) 정의 기록


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
  - **Repository Interface** (`lib/core/repositories/interfaces/`): Supabase 비종속적인 도메인 언어로 정의된 데이터 접근 계약.
  - **Repository Implementation** (`lib/core/repositories/supabase/`): Supabase SDK를 사용한 구체 구현체.
  - **Service** (`lib/core/services/`): 비즈니스 로직 캡슐화. Repository 인터페이스를 생성자 주입으로 받는다.
- **DI 전략 (Domain-specific Container)**:
  - 도메인별 컨테이너 팩토리 함수(`containers/`)가 Supabase 클라이언트 생성 → Repository 인스턴스화 → Service 인스턴스화를 수행한다.
  - Controller에서 `const { applicationService } = createApplicationContainer()` 형태로 사용하여 보일러플레이트를 최소화한다.
- **에러 처리**:
  - `AppError` 경량 에러 클래스(`lib/core/errors.ts`)로 도메인 에러를 표현한다.
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

**2. Service** (`lib/core/services/ApplicationService.ts`) — 비즈니스 로직 캡슐화:

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

**3. Repository Interface** (`lib/core/repositories/interfaces/application.repository.ts`) — DB 비종속 계약:

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

**4. Repository Implementation** (`lib/core/repositories/supabase/SupabaseApplicationRepository.ts`) — Supabase 구체 구현:

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
│   ├── charts/           # 차트 공통 컴포넌트 (ChartCard, 색상 시스템)
│   └── app/              # 도메인 특정 컴포넌트
├── lib/                  # 핵심 로직 및 유틸리티
│   ├── api/              # HTTP 응답 헬퍼 (toErrorResponse 등)
│   ├── auth/             # 인증 및 보안 (JWT, 세션)
│   ├── containers/       # 도메인별 DI 컨테이너 팩토리
│   ├── core/             # 핵심 계층 (Centralized Services & Repositories)
│   │   ├── analytics/     # 분석 타입 정의 (types.ts)
│   │   ├── errors.ts     # AppError 경량 에러 클래스
│   │   ├── repositories/ # Repository 계층
│   │   │   ├── interfaces/ # 인터페이스 정의
│   │   │   └── supabase/   # Supabase 구현체
│   │   └── services/     # 서비스 계층 (Business Logic)
│   │       ├── interfaces/ # 도메인 서비스 인터페이스
│   │       ├── llm/        # LLM 관련 구현체
│   │       └── scrapers/   # 스크래퍼 관련 구현체
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
- **서버 컴포넌트 기반 접근 제어**: 보호된 경로(`/dashboard`, `/applications`, `/board`)는 각 서버 컴포넌트에서 `requireServerAuth(callbackUrl)`를 호출하여 JWT 토큰을 검증한다. 비인증 사용자는 `/auth?callbackUrl=<원래경로>`로 리다이렉트되어 로그인 후 원래 목적지로 복귀한다.
- **callbackUrl 경계 함수**: `getSafeCallbackUrl()` (`lib/auth/callback-url.ts`)이 사용자 입력 callbackUrl을 정규화하며, 상대 경로만 허용하고 오픈 리다이렉트(절대 URL, protocol-relative, javascript scheme 등)를 차단한다. 안전하지 않은 값은 `/dashboard`로 fallback된다.
- **인증 사용자 진입 정책**: 루트(`/`)는 서버 컴포넌트에서 인증 상태를 확인해 대시보드로 리다이렉트하며, `?landing=true` 파라미터로 랜딩 페이지 수동 접근을 허용한다. `/auth` 페이지는 인증 사용자 진입 시 callbackUrl 경계 함수를 통해 안전한 경로로 리다이렉트한다.
- **서버 컴포넌트 보안**: 최종적인 토큰 검증 및 사용자 식별은 서버 컴포넌트(`requireServerAuth`)와 API Route(`requireAuth`)에서 수행한다.
- **소유권 검증**: 모든 리소스 접근 시 `user_id`를 통한 소유권 검증 필수 (Repository 레벨에서 userId 조건 강제).

---

## 6. API 설계 및 운영 (API Design)

### 6.1 설계 원칙
- **RESTful API**: 리소스 중심의 엔드포인트 설계.
- **응답 규격**: 에러 코드와 메시지를 포함한 표준 JSON 응답 포맷 준수.
- **문서화**: API 변경 시 `public/openapi.json` 업데이트 및 Swagger(` /swagger`) 동기화.

---

## 7. 인프라 및 운영 (Infrastructure)

### 7.1 환경별 데이터베이스 분리

Supabase 프로젝트를 환경별로 분리하여 운영한다.

| 환경 | 용도 | Vercel 환경 |
| :--- | :--- | :--- |
| Development/Test | 로컬 개발, 테스트, Preview 배포 | Preview, Development |
| Production | 프로덕션 서비스 | Production |

- **연결 방식**: 환경변수(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)로 결정되며, 코드 변경 없이 환경변수만으로 DB가 전환된다.
- **Vercel 설정**: 각 환경(Production / Preview)에 해당 Supabase 프로젝트의 키를 별도로 설정한다.
- **타입 생성**: `pnpm db:types`는 `supabase link`로 연결된 프로젝트 기준으로 타입을 생성한다. 두 프로젝트의 스키마가 동일해야 한다.
- **환경변수 목록**: `.env.example` 참조.

### 7.2 스케줄링 및 웹훅
- **Cron**: Vercel Cron을 사용한 일일 리마인더 배치 작업 실행.
- **Webhook**: Resend 이메일 발송 상태 수신 및 Svix를 통한 웹훅 검증.

---

## 8. 로드맵 (Technical Roadmap)

- **[V2-DONE] Repository 패턴 도입**: interface 기반 Repository + class 기반 Service + 도메인별 Container로 3계층 아키텍처 완성.
- **[V2-DONE] 알림 서비스 독립화**: NotificationService 추출 완료. 단위 테스트 강화는 추후 진행.
- **[V2-PLANNED] Auth 추상화**: `IAuthService` 도입 및 Supabase Auth 마이그레이션.
- **[V3-DONE] 데이터 시각화 및 분석**: Dashboard KPI/차트, Board 운영지표, Application 타임라인, Analytics 심화 페이지 구현 완료. Recharts + ChartCard 패턴 도입.

---

## 9. 채용 공고 파싱 파이프라인 (Job Parsing Pipeline)

### 9.1 파이프라인 구조
- **Orchestrator**: `JobParsingService`가 전체 흐름을 제어한다.
- **Adapter Config**: `ADAPTER_CONFIG`를 통해 도메인별 최적화된 스크래핑 및 파싱 규칙을 정의한다.
- **Scraper Layer**: `NativeScraper`(빠름/저비용)와 `ScrapingBeeScraper`(JS 렌더링/우회)를 상황에 맞게 사용한다.
- **Parser Layer**: `OpenAiParsingService`가 `cheerio`를 사용하여 본문을 추출하고, LLM을 통해 정형 데이터로 변환한다.

### 9.2 주요 전략 (Error Handling & Fallback Policy)

- **스크래퍼 레이어 (Scraper Layer)**: 404/410 에러는 `NOT_FOUND`로 매핑하여 즉시 중단하며, 네트워크 오류나 5xx 에러는 `SCRAPE_FAILED` / `UPSTREAM_ERROR`로 처리하여 상위 레이어에서 재시도 여부를 결정한다.
- **지능형 라우팅 및 Fallback**: `render_js` 설정에 따라 스크래퍼를 선택하며, Native 요청이 차단(403, 429)되거나 본문이 너무 짧을 경우, 혹은 404가 아닌 에러 발생 시 자동으로 ScrapingBee로 **최대 1회** 재시도한다. ScrapingBee 최초 시도 실패 시에는 더 이상 fallback 하지 않는다.
- **LLM 파서 에러 분리**: LLM 단계에서 발생하는 다양한 에러(JSON 파싱 실패, 스키마 불일치, Rate Limit, Incomplete Response)를 세분화하여 적절한 HTTP 상태 코드(422, 429, 502)로 반환한다.
- **Best-effort 캐싱**: 캐시 조회(`get`) 및 저장(`set`) 실패는 치명적이지 않은 오류로 간주한다. 실패 시 로깅만 수행하고 전체 파싱 비즈니스 로직은 계속 진행한다.
- **LLM 전처리 및 비용 최적화**: 

  - `cheerio`로 불필요한 태그(`script`, `style` 등) 및 노이즈(추천 공고 등)를 제거한다.
  - `Turndown`을 사용하여 HTML을 Markdown으로 변환, 토큰 사용량을 최소화한다 (최대 15,000자).
- **Graceful Fallback**: 특정 사이트의 셀렉터가 변경되어 매칭에 실패할 경우, `generic` 설정으로 전환하거나 전체 텍스트 추출 모드로 자동 복구한다.


- **[V3-DONE] 채용 공고 파싱 고도화**: `ADAPTER_CONFIG` 기반 멀티 사이트 대응, ScrapingBee/Native 스크래퍼 동적 라우팅, LLM 전처리 최적화(HTML 최소화) 적용 완료. 에러 핸들링 고도화(404 처리, 재시도 정책 최적화, LLM 에러 세분화, 캐시 비치명 처리)를 통해 안정성 및 비용 효율성을 확보함.

### 9.3 클라이언트 파싱 UX (Client-Side Parse Flow)

서버 파싱 파이프라인(§9.1~9.2)을 클라이언트 신규/수정 폼에 연결하는 UX 계층이다.

#### 신규 지원서 (URL-First Auto-Fill)
- 폼 상단에 URL 입력 + "URL 파싱" 버튼을 배치한다.
- 파싱 성공 시 `mapParsedJobToFormPatch()`로 폼 필드를 자동 채운다.
- 파싱 실패/부분성공 시 상태 메시지를 표시하고, 사용자가 수동으로 필수 필드(회사명/포지션/URL)를 입력하면 저장 가능하다.

#### 수정 지원서 (Explicit Reparse + Selective Apply)
- URL 변경만으로는 파싱을 호출하지 않는다. "재파싱" 버튼 클릭 시에만 호출된다.
- 파싱 결과를 현재 폼 값과 비교하여 변경된 필드만 후보 패널(candidate panel)로 표시한다.
- 사용자가 체크박스로 반영할 필드를 선택한 뒤 "선택 반영" 버튼으로 일괄 적용한다.
- 선택하지 않은 필드는 절대 변경되지 않는다 (자동 덮어쓰기 금지).

#### 관련 모듈
| 모듈 | 경로 | 역할 |
|------|------|------|
| Parse Types | `src/lib/parse/types.ts` | `ParseStatus`, `ParsedJob`, `ParseResultDto` 타입 정의 |
| Mapper | `src/lib/parse/mapper.ts` | `ParsedJob` → `Partial<ApplicationFormValues>` 변환 |
| Merge Utils | `src/lib/parse/merge.ts` | `getChangedFields`, `applySelectedFields`, `getDiff` |
| URL Parse Block | `src/app/applications/_components/url-parse-block.client.tsx` | 공용 URL 입력 + 파싱 액션 UI |
| API Client | `src/lib/api/client.ts` | `applicationsApi.parse()` — 클라이언트측 URL 검증 + 에러 매핑 |

---

## 10. 데이터 시각화 및 분석 파이프라인 (Analytics Pipeline)

### 10.1 파이프라인 구조
- **데이터 소스**: `applications` + `events` 테이블을 집계 쿼리(COUNT, GROUP BY, DATE_TRUNC)로 가공한다.
- **Repository**: `IAnalyticsRepository` 인터페이스가 6개 메서드(stageFunnel, trendByPeriod, sourcePerformance, boardMetrics, dailyActivity, timelineForApplication)를 정의하며, `SupabaseAnalyticsRepository`가 Supabase RPC/쿼리로 구현한다.
- **Service**: `AnalyticsService`가 Repository 메서드를 조합하여 3개 유스케이스(getDashboardAnalytics, getBoardAnalytics, getApplicationTimeline)를 제공한다.
- **Container**: `createAnalyticsContainer()`가 DI 조립을 수행한다.

### 10.2 데이터 흐름
```text
Server Component / API Route
  → createAnalyticsContainer()
  → AnalyticsService.getDashboardAnalytics(userId)
  → IAnalyticsRepository.stageFunnel(userId) + trendByPeriod(...) + sourcePerformance(...)
  → Supabase SQL (COUNT, GROUP BY, DATE_TRUNC)
  → 집계 결과 → Service가 DTO 조합 → Controller가 JSON 응답
```

### 10.3 API 엔드포인트
| 엔드포인트 | 메서드 | 용도 |
| :--- | :--- | :--- |
| `/api/analytics/dashboard` | GET | KPI 카드, 퍼널, 추이, 출처별 성과 데이터 |
| `/api/analytics/board` | GET | 칸반 보드 운영 지표 (전환율, 정체 알림) |

### 10.4 차트 시스템
- **라이브러리**: Recharts v3 (React 19 호환, 트리셰이킹 지원).
- **공통 래퍼**: `ChartCard` (`src/components/charts/chart-card.tsx`) — 타이틀, 빈 상태 처리, 반응형 컨테이너를 제공하는 `"use client"` 컴포넌트.
- **색상 시스템**: `CHART_COLORS` (`src/components/charts/chart-colors.ts`) — CSS 변수 기반으로 라이트/다크 모드를 자동 지원한다.
- **차트 컴포넌트**: 각 페이지의 `_components/` 디렉토리에 Client Component로 배치하며, Server Component에서 데이터를 props로 전달받는다.

### 10.5 시각화 페이지 구성
| 페이지 | 시각화 요소 | 데이터 소스 |
| :--- | :--- | :--- |
| `/dashboard` | KPI 5카드, 퍼널 차트, 추이 차트, 출처별 성과 | Server Component → AnalyticsService |
| `/board` | 칼럼 헤더 전환율(→ N%), 14일+ 정체 배지 | Server Component → AnalyticsService |
| `/applications/[id]` | 타임라인 카드 (시간순, D-day 배지) | Server Component → AnalyticsService |
| `/analytics` | 기간 선택 + 전체 차트 심화 뷰 | Client Component → API Routes |
