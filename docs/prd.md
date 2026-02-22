# JobTrack 통합 제품 요구사항 정의서 (Integrated PRD)

> **문서 관리 규칙**
> - **단일 진실 공급원 (SSOT)**: 모든 기획, 설계, 의사결정 내역은 본 문서(`docs/prd.md`)에 통합 관리한다.
> - **대상**: 본 문서는 개발자(사람)와 AI(LLM)가 프로젝트의 전체 맥락을 파악하고 일관된 결정을 내리기 위한 기초 자료로 활용된다.
> - **기록 원칙**: 비즈니스 요구사항, 기술적 요구사항, 의사결정 판단 근거(Rationale)를 반드시 포함한다.
> - **버전 관리**: V1(MVP), V2(고도화) 등 단계별 진행 상황을 상태 태그(`[DONE]`, `[PLANNING]`, `[NEXT]`)로 명확히 구분한다.
> - **언어**: 모든 내용은 한글 작성을 원칙으로 한다.

---

## 1. 프로젝트 개요 (Project Overview)
- **이름**: JobTrack
- **목표**: "취업 준비생이 지원 현황을 한눈에 파악하고, 중요한 면접/코테 일정을 놓치지 않도록 돕는 자동화된 관리 플랫폼"
- **핵심 가치**: 일정 누락 방지, 지원 파이프라인 시각화, 서류 통합 관리.
- **V2 목표**: **"Architecture for Tomorrow"** - 인프라 의존성 제거(DIP), 확장성 확보, 운영 안정성을 위한 아키텍처 고도화 및 유저 경험 개선.

---

## 2. 핵심 아키텍처 및 기술 스택 (Architecture & Tech Stack)

### 2.1 아키텍처 전략
- **Layered Architecture (V2 Transition)**: `Controller -> Service -> Repository`의 3계층 구조를 지향한다.
  - **Rationale**: 의존성 역전 원칙(DIP)을 적용하여 도메인 로직과 인프라(Supabase SDK 등)를 분리한다. 이는 향후 DB 교체나 서버 분리(NestJS 등) 시 UI와 비즈니스 로직 수정을 최소화하기 위함이다.
- **BFF (Backend For Frontend) Pattern**: Next.js API Routes를 클라이언트와 데이터베이스 사이의 중계 레이어로 활용한다.
  - **Rationale**: 보안(Secret 관리) 및 데이터 가공 로직을 서버측에 집중시켜 프론트엔드의 복잡도를 낮추고 안정적인 API 계약을 유지한다.

### 2.2 기술 스택 및 선정 근거
| 분류 | 기술 | 선정 근거 (Rationale) |
| :--- | :--- | :--- |
| **Frontend** | Next.js 16 (App Router) | 풀스택 학습 효율이 높고, Server Components를 통해 초기 렌더링 성능(LCP)과 SEO 최적화가 용이함. |
| **State** | TanStack Query | 서버 데이터 캐싱/동기화를 체계화하고, SSR Hydration 패턴을 통해 로딩 사용자 경험(UX)을 개선함. |
| **Backend** | Supabase | Auth, DB(Postgres), Storage를 통합 제공받아 초기 개발 속도를 높이고 RLS 보안 모델을 학습하기 최적임. |
| **Styling** | Tailwind CSS 4 | CSS 변수 기반 토큰을 통해 다크모드 및 테마 확장이 용이하며 빠른 UI 반복 개발이 가능함. |
| **Messaging** | Resend + Svix | 트랜잭션 이메일 발송과 웹훅 검증을 통한 데이터 정합성(발송 상태 업데이트 등) 확보가 직관적임. |
| **Testing** | Vitest | V2의 핵심인 서비스/리포지토리 레이어의 단위 테스트를 위해 빠르고 경량화된 테스트 환경을 구축함. |

---

## 3. 정보 아키텍처 (Information Architecture)

### 3.1 사용자 경로 및 페이지 구조
- **공개 페이지 (Public)**:
  - `/` : 서비스 소개 및 기능 안내 (랜딩 페이지)
  - `/auth` : 로그인 및 회원가입 (Tabs 전환 방식)
  - `/swagger` : API 명세서 및 인터랙티브 테스트 도구
- **보호 페이지 (Protected)**:
  - `/dashboard` : 핵심 지표(지원 수 등) 및 다가오는 일정 요약
  - `/board` : 지원 단계별 칸반 보드 (드래그 앤 드롭 지원)
  - `/applications/new` : 신규 지원서 등록 폼
  - `/applications/[id]` : 지원서 상세 정보, 일정(면접/코테) 관리, PDF 서류 관리

### 3.2 데이터 흐름 및 상태 관리
- **조회 (Read)**: Page (Server Component) -> Service -> Repository -> Supabase
- **명령 (Write/Update)**: Client Island (React Query) -> API Route (BFF) -> Service -> Repository -> Supabase

---

## 4. 기능 명세 및 진척도 (Feature Set & Evolution)

### 4.1 인증 및 보안 (Auth & Security)
- **[V1-DONE] 커스텀 JWT 인증**: HttpOnly Cookie 기반의 자체 JWT 관리 로직 구현.
  - **Rationale**: 인증의 기본 원리(Stateless, Security) 학습을 위해 직접 구현.
- **[V2-PLANNING] Supabase Auth 전환**: 소셜 로그인(OAuth) 및 MFA 대응을 위한 관리형 서비스 도입.
  - **Rationale**: 운영 효율성과 확장성을 위해 검증된 솔루션으로 마이그레이션.
- **[V2-PLANNING] Auth 추상화**: `IAuthService` 인터페이스 도입으로 벤더 종속성 제거.

### 4.2 지원서 및 일정 관리 (Applications & Events)
- **[V1-DONE] 지원서 CRUD**: 기업명, 직무, 상태 등 기본 정보 트래킹.
- **[V1-DONE] 칸반 보드**: 지원 단계를 시각적으로 관리 (`/board`).
- **[V1-DONE] 일정 자동 리마인더**: Cron을 통한 D-3, D-1 이메일 알림 발송.
- **[V1-DONE] 리마인더 안정성**: Resend 웹훅을 통한 발송 성공 확인 및 DB 플래그 업데이트.
- **[V2-NEXT] Repository 패턴 적용**: `ApplicationRepository`, `EventRepository` 구현으로 DB 의존성 분리.
- **[V2-PLANNING] 알림 서비스 독립화**: Cron 로직을 `NotificationService`로 추출하여 단위 테스트 수행.

### 4.3 문서 관리 (Documents)
- **[V1-DONE] PDF 업로드/삭제**: Supabase Storage 연동 및 10MB 제한 적용.
- **[V2-PLANNING] 스토리지 추상화**: 파일 저장 로직을 Repository로 캡슐화하여 인프라 전환성 확보.

### 4.4 마케팅 및 UX (Marketing & UX)
- **[V2-PLANNING] 정적 랜딩 페이지**: 비로그인 유저에게 서비스 가치 전달.
- **[V2-PLANNING] 전역 다크모드**: CSS 변수 정리를 통한 표준 다크모드 테마 스위칭 지원.
- **[V2-PLANNING] 공용 Footer**: 프로젝트 신뢰도를 위한 링크 및 연락처 정보 제공.

---

## 5. 기술 제약 및 운영 규칙 (Constraints & Rules)
- **보안**: `.env` 시크릿값 노출 금지, API Route 접근 시 반드시 JWT 세션 검증.
- **성능**: Server Components 우선 적용, 클라이언트 상호작용이 필요한 경우에만 Client Island 사용.
- **데이터**: 모든 리소스 접근 시 `user_id`를 통한 소유권 검증(Ownership) 필수.
- **문서화**: API 변경 시 `public/openapi.json` 즉시 업데이트 및 Swagger 동기화.

---

## 6. 데이터베이스 스키마 (Database Schema)
- **users**: id, email, password_hash, created_at
- **applications**: id, user_id, company_name, position, career_type, source, status, created_at
- **application_events**: id, application_id, type(interview/deadline/test), scheduled_at, notified_d1, notified_d3
- **documents**: id, user_id, application_id, name, storage_path, type

---

## 7. 로드맵 (Feature Status Roadmap)
- [V2-NEXT] Task 1: Application 도메인 리팩토링 (Repositories 도입)
- [V2-PLANNED] Task 2: Auth 추상화 및 Supabase Auth 마이그레이션
- [V2-PLANNED] Task 3: 알림 시스템 독립화 및 단위 테스트 구축
- [V2-PLANNED] Task 4: 랜딩 페이지 및 UI 고도화 (다크모드 포함)
