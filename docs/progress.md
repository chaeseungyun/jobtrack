# Progress Log

## 2026-02-14

### 1) 오늘의 목표
- Next.js 초기 세팅
- API Route 초기 세팅
- Supabase 초기 세팅 및 테이블 생성

### 2) 작업 내용
- Done:
  - Next.js 초기 세팅 완료
  - shadcn/ui 컴포넌트 설치 완료
  - DB 헬스 체크 API(`GET /api/health/db`) 구현 완료
  - Supabase 연결 및 타입 구조(`generated + domain`) 정리 완료
- In Progress:
  - 없음
- Blocked:
  - 없음

### 3) 개발 판단 로그
- 주제: Supabase 타입 관리 방식
- 선택지:
  - A: PRD 스키마 기준 수기 타입 작성
  - B: Supabase type generator 기반 생성
- 최종 결정: B안
- 판단 근거(왜): DB 스키마와 타입 정합성을 유지하기 위해 자동 생성 기준을 사용하고, 도메인 제약 타입만 별도 관리
- 예상 리스크: `supabase link` 미완료 시 `db:types` 실행 실패

- 주제: env 값 조회 함수(`getRequiredEnv`)의 정의 위치
- 선택지:
  - A: 공용 `utils.ts`로 분리
  - B: 필요한 파일 내부에 정의
- 최종 결정: B안
- 판단 근거(왜): `service_role` 관련 로직은 서버 전용이어야 하므로 `server-only` 경계 내부에 두는 것이 안전
- 예상 리스크: 서버 전용 함수의 잘못된 import 시 빌드 실패 가능

### 4) 검증/지표
- API health: 성공 (`200`, `{"ok":true,"database":"connected"}`)
- Build: 실패 (기존 설정 이슈: `tsconfig`의 `ignoreDeprecations` 값 오류)
- 타입/린트: 타입 파일 진단 통과, 전체 린트는 미실행
- 배포 후 오류 보고 건수: 미배포
- 생산성 지표(선택): 작업 소요 시간 기록 필요

### 5) 학습 로그
- 배운 점:
  - Supabase 프로젝트 초기 연결 흐름
  - SQL Editor 기반 테이블 생성
  - `supabase gen` 기반 타입 관리 전략
  - `server-only`를 활용한 클라이언트/서버 경계 설정
- 근거(문서/실험): 코드 변경 + 로컬 API 검증 결과
- 다음에 적용할 점:
  - 프로젝트 시작 시 타입 생성 스크립트와 서버 경계 정책을 먼저 고정

### 6) 다음 액션
- [ ] `tsconfig`의 `ignoreDeprecations` 값 수정 후 `pnpm build` 재검증
- [ ] Step 3(Auth) 구현 시작 (`register/login/logout`)
