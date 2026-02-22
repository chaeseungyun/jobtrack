# JobTrack 시스템 아키텍처 설계서 (Architecture)

> **문서 관리 규칙**
> - **기술적 의사결정 기록**: 모든 아키텍처 설계, 기술 스택 선정 근거, 데이터 흐름은 본 문서에 기록한다.
> - **참조 문서**: 비즈니스 요구사항은 `docs/prd.md`를 참조한다.

---

## 1. 아키텍처 전략 (Architecture Strategy)

### 1.1 계층형 아키텍처 (Layered Architecture)
- **구조**: `Controller (Route Handlers) -> Service -> Repository`
- **목적**: 의존성 역전 원칙(DIP)을 적용하여 도메인 로직을 인프라(Supabase SDK 등)로부터 분리한다. 
- **Rationale**: 향후 DB 교체나 프레임워크 전환 시 비즈니스 로직 수정을 최소화하기 위함이다.

### 1.2 BFF (Backend For Frontend) 패턴
- **구조**: Next.js API Routes를 클라이언트와 데이터베이스 사이의 중계 레이어로 활용한다.
- **Rationale**: 보안(Secret 관리) 및 데이터 가공 로직을 서버측에 집중시켜 클라이언트의 복잡도를 낮추고 일관된 API 계약을 유지한다.

---

## 2. 기술 스택 및 선정 근거 (Tech Stack)

| 분류 | 기술 | 선정 근거 (Rationale) |
| :--- | :--- | :--- |
| **Frontend** | Next.js 16 (App Router) | Server Components를 통한 성능 최적화 및 풀스택 개발 효율성. |
| **State** | TanStack Query | 서버 데이터 캐싱/동기화 체계화 및 로딩 UX 개선. |
| **Backend** | Next.js API Routes | BFF 패턴 구현 및 Vercel 인프라 최적 활용. |
| **Database** | Supabase (Postgres) | 통합 인프라 제공을 통한 초기 개발 속도 확보. |
| **Auth** | Custom JWT / Supabase Auth (V2) | 인증 원리 학습 후 관리형 서비스로의 단계적 전환. |
| **Styling** | Tailwind CSS 4 | CSS 변수 기반 테마 확장 및 빠른 UI 개발. |

---

## 3. 코드베이스 구조 (Codebase Structure)

```text
src/
├── app/                  # Next.js App Router (Pages & API Routes)
│   ├── api/              # BFF API Routes
│   └── (routes)/         # UI Pages
├── components/           # UI Components
│   ├── ui/               # shadcn/ui 원자 컴포넌트
│   └── app/              # 도메인 특정 컴포넌트
├── lib/                  # 핵심 로직 및 유틸리티
│   ├── auth/             # 인증 및 보안 (JWT, 세션)
│   ├── services/         # 비즈니스 로직 (Application, Email 등)
│   ├── supabase/         # DB 클라이언트 및 데이터 접근
│   └── validation/       # Zod 기반 요청 검증
└── types/                # 공용 타입 정의
```

---

## 4. 데이터 아키텍처 (Data Architecture)

### 4.1 데이터 흐름
- **Read**: Page (Server Component) -> Service -> Repository -> Supabase
- **Write**: Client Component (React Query) -> API Route (BFF) -> Service -> Repository -> Supabase

### 4.2 데이터베이스 스키마 (ERD 요약)
- **users**: 사용자 기본 정보 및 자격 증명.
- **applications**: 지원서 메인 정보 (기업명, 직무, 상태 등).
- **application_events**: 면접, 마감일 등 일정 정보 (Remind 플래그 포함).
- **documents**: 지원서 관련 첨부 파일 메타데이터.

---

## 5. 인증 및 보안 (Auth & Security)

### 5.1 인증 메커니즘
- **V1 (Current)**: HttpOnly Cookie 기반의 자체 JWT 관리 로직. 
  - `jsonwebtoken` 라이브러리를 사용한 Stateless 인증.
- **V2 (Planned)**: Supabase Auth 전환을 통한 OAuth 및 세션 관리 고도화.
- **보안 원칙**: 
  - API Route 접근 시 반드시 JWT 세션 검증.
  - 모든 리소스 접근 시 `user_id`를 통한 소유권 검증 필수.

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

- **[V2-NEXT] Repository 패턴 도입**: DB 의존성 분리를 위한 데이터 접근 계층 추상화.
- **[V2-PLANNED] Auth 추상화**: `IAuthService` 도입 및 Supabase Auth 마이그레이션.
- **[V2-PLANNED] 알림 서비스 독립화**: NotificationService 추출 및 단위 테스트 강화.
