# Progress Log

## 2026-02-15
### 1) 오늘의 목표
- Server components를 활용하도록 아키텍처 변경
- jwt 관리를 브라우저 스토리지가 아닌 쿠키에서 하도록 변경
- 지원서 등록 화면 UI(`/applications/new` 또는 동등 경로) 구현하기

### 2) 작업 내용
- Done:
- In Progress:
  - Server components를 활용하도록 아키텍처 변경
  - jwt 관리를 브라우저 스토리지가 아닌 쿠키에서 하도록 변경
- Blocked:
  - 없음

### 3) 개발 판단 로그
- 주제: 렌더링 방식
- 선택지:
  - A: CSR 중심 구조 (Client Component + useEffect 데이터 패칭)
  - B: SSR 기반 구조 (Server Components First)
- 최종 결정: B안
- 판단 근거(왜):
  1. 초기 렌더링 성능 개선
  CSR 구조에서는 데이터 패칭이 hydration 이후 수행되므로 주요 콘텐츠가 JS 실행 이후 렌더링됨. 이는 LCP 지표에 불리함.
  반면 Server Components는 서버에서 데이터 패칭 후 완전한 HTML을 제공하므로 초기 콘텐츠 표시 속도 개선 가능
  2. 번들 크기 감소
  Server Components는 클라이언트 번들에 포함되지 않으므로 JS 번들 크기를 줄이고 hydration 비용을 낮출 수 있음.
  3. Next.js App Router 철학과 맞닿음
  App router는 Server Components, Data Cache, Streaming 등을 전제로 설계되어 있음.
  4. 캐싱
  서버 기반 데이터 패칭은 Next.js의 캐시 전략을 적극 활용 가능
  5. PPR 도입 가능성
  향후 Partial Pre-Rendering을 적용하여 정적/동적 영역을 분리하는 실험적 구조 확장 가능
- 예상 리스크: Server Components와 Client Components 경계 설정 복잡도 증가

## 2026-02-14

### 1) 오늘의 목표
- Next.js 초기 세팅
- API Route 초기 세팅
- Supabase 초기 세팅 및 테이블 생성
- Step 3(Auth) 구현
- Step 4(Applications/Events/Documents API) 구현

### 2) 작업 내용
- Done:
  - Next.js 초기 세팅 완료
  - shadcn/ui 컴포넌트 설치 완료
  - DB 헬스 체크 API(`GET /api/health/db`) 구현 완료
  - Supabase 연결 및 타입 구조(`generated + domain`) 정리 완료
  - JWT(7d) 기반 인증 API(`register/login/logout`) 구현 완료
  - Swagger 페이지(`/swagger`) 및 OpenAPI 스펙(`public/openapi.json`) 추가 완료
  - `JWT_SECRET` 생성 및 로컬 반영 완료
  - Step 4 API 구현 완료
    - Applications CRUD
    - Events 생성/수정/삭제
    - Documents 업로드/삭제(PDF/10MB 제한)
    - Zod 입력 검증 적용
  - Step 4 API 스펙 `public/openapi.json` 동기화 완료
  - Step 5 UI 1차 구현 완료
    - `/auth`: 로그인/회원가입 탭 + JWT 토큰 저장
    - `/dashboard`: 지표 카드 + 다가오는 일정 + 최근 지원서
    - `/board`: 단계별 칸반 보드
    - `/applications/[id]`: 상세 조회 + 기본 필드 수정
- In Progress:
  - 지원서 등록 화면 UI(`/applications/new` 또는 동등 경로) 미구현
- Blocked:
  - 없음

### 3) 개발 판단 로그
- 주제: Supabase 타입 관리 방식
- 선택지:
  - A: PRD 스키마 기준 수기 타입 작성
  - B: Supabase type generator 기반 생성 + 도메인 타입 분리
- 최종 결정: B안
- 판단 근거(왜): DB 스키마 정합성은 자동 생성으로 보장하고, 비즈니스 제약(도메인)은 별도 타입으로 관리하는 편이 유지보수/안정성 측면에서 유리
- 예상 리스크: `supabase link` 미완료 시 `db:types` 실행 실패

- 주제: `getRequiredEnv` 정의 위치
- 선택지:
  - A: 공용 `utils.ts`로 분리
  - B: 필요한 파일 내부(`server-only`)에 정의
- 최종 결정: B안
- 판단 근거(왜): `service_role` 관련 로직은 서버 전용 경계에서만 실행되어야 하므로, 범용 유틸 분리보다 파일 내부 고정이 안전
- 예상 리스크: 서버 전용 함수를 클라이언트 영역에서 import하면 빌드 실패 가능

- 주제: 인증 방식 선택
- 선택지:
  - A: JWT(7d)
  - B: Cookie + Session
- 최종 결정: A안
- 판단 근거(왜): 현재 목표(빠른 MVP + API 중심 구현)에서 구현 복잡도를 낮추면서도 인증 흐름을 빠르게 검증 가능
- 예상 리스크: 탈취된 JWT는 만료 전 강제 무효화가 어려움(블랙리스트/세션 저장소 미도입 상태)

- 주제: API 테스트 환경 선택
- 선택지:
  - A: Swagger
  - B: Postman
- 최종 결정: A안
- 판단 근거(왜): 프로젝트 내부에서 즉시 테스트 가능하고, API 문서와 테스트를 한 경로(`/swagger`)로 일원화 가능
- 예상 리스크: API 변경 시 `public/openapi.json` 미갱신하면 문서-코드 불일치 발생

- 주제: 리소스 소유권(Authorization) 검증 방식
- 선택지:
  - A: 각 테이블 쿼리마다 `user_id` 직접 조건 처리
  - B: 공통 ownership helper를 통해 애플리케이션/이벤트/문서 검증 일원화
- 최종 결정: B안
- 판단 근거(왜): Step4에서 리소스 타입이 늘어나면서 중복 로직/누락 위험이 커지므로 helper 기반이 안정적
- 예상 리스크: helper 수정 시 영향 범위가 넓어져 회귀 테스트 필요

### 4) 검증/지표
- API health: 성공 (`200`, `{"ok":true,"database":"connected"}`)
- Auth E2E: 성공 (`register 201`, `login 200`, `logout 200`)
- Swagger/OpenAPI 접근: 성공 (`/swagger 200`, `/openapi.json 200`)
- Step 4 E2E: 성공
  - application: `create 201`, `list 200`, `get 200`, `patch 200`, `delete 204`
  - event: `create 201`, `patch 200`, `delete 204`
  - document: `upload 201`, `delete 204`
- Build: pass
- 타입/린트: 변경 파일 타입 진단 통과, 전체 린트는 미실행
- 배포 후 오류 보고 건수: 미배포
- 생산성 지표(선택): 작업 소요 시간 기록 필요

### 5) 학습 로그
- 배운 점:
  - Supabase 프로젝트 초기 연결 흐름
  - SQL Editor 기반 테이블 생성
  - `supabase gen` 기반 타입 동기화 전략
  - `server-only`를 활용한 서버/클라이언트 경계 설계
  - JWT 만료시간(7d) 기준의 인증 API 설계 및 검증
  - Swagger를 통한 API 문서/테스트 일원화 운영
  - 리소스 소유권 검증(helper) 구조화
  - 파일 업로드 보안 검증(PDF MIME + 10MB 제한)
- 근거(문서/실험): 코드 변경 + 로컬 API/빌드 검증 결과
- 다음에 적용할 점:
  - 프로젝트 시작 시 타입 생성 스크립트, 인증 정책, API 문서 정책을 먼저 고정
  - API 변경 시 스펙(`public/openapi.json`) 동시 수정을 PR 체크리스트에 포함

### 6) 다음 액션
- [ ] 지원서 등록 화면 UI 추가 구현
- [ ] UI 구현 시 Step4 엔드포인트 연결 E2E 재검증

### 7) 이력서/포트폴리오용 요약 포인트
- Next.js App Router 기반 풀스택 MVP에서 인증(JWT), DB(Supabase), API 문서화(Swagger)까지 단일 리포에서 설계/구현/검증 수행
- 인증/타입/문서 정책을 코드와 문서(AGENTS.md, steps.md, progress.md)에 일관되게 반영해 운영 가능한 개발 흐름 구축
