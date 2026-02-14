# JobTrack 개발 로드맵 (MVP 2-3일)

## 목표
- 2-3일 안에 배포 가능한 JobTrack MVP를 완성한다.
- 핵심 가치(일정 누락 방지 + 지원 파이프라인 가시화)를 먼저 구현한다.

## 역할 분담
- 너(사용자): 요구사항 판단/결정, 외부 서비스 설정(Supabase/Vercel/Resend) 및 비밀값 관리
- 나(에이전트): 코드 작성, 아키텍처 설계/제안, 문서 업데이트, 검증

## 현재 전제
- `.env.local` 생성 완료
- Supabase 테이블/스토리지 설정 완료
- 패키지 매니저는 `pnpm` 사용

---

## Step 1. 프로젝트 기반 세팅
- [x] Next.js 14 App Router 구조 정리
- [x] shadcn/ui 초기화 및 핵심 컴포넌트 설치
- [x] 기본 폴더 구조 생성(`app`, `components`, `lib`, `types`)

산출물
- 기본 실행 가능한 프로젝트 구조
- shadcn/ui 컴포넌트 사용 준비 완료

완료 기준
- [x] `pnpm dev` 정상 실행

검증 메모
- [x] Step 1 완료 및 로컬 검증 완료

---

## Step 2. Supabase 연동 베이스 코드
- [x] 서버용 Supabase 클라이언트(`service_role`) 분리
- [x] 브라우저용 Supabase 클라이언트(`anon`) 분리
- [x] DB 타입 파일 생성/연동

산출물
- `lib/supabase/server.ts`, `lib/supabase/client.ts` 등 연동 유틸

완료 기준
- [x] 테스트 API에서 DB 연결 성공 확인

진행 메모
- [x] Step 2 코드 구현 완료
- [x] 로컬 API 호출로 DB 연결 성공 확인 (`GET /api/health/db`)
- [x] DB 타입 생성 스크립트 추가 (`pnpm db:types`, `pnpm db:types:local`)
- [x] 데이터 생성/관리는 Supabase Dashboard 우선 사용(초기 개발 단계)

---

## Step 3. 인증(Auth) 구현
- [ ] 회원가입 API(`POST /api/auth/register`)
- [ ] 로그인 API(`POST /api/auth/login`)
- [ ] 로그아웃 API(`POST /api/auth/logout`)
- [ ] JWT 발급/검증 유틸 및 보호 라우트 처리

산출물
- 인증 API 3종 + 토큰 검증 로직

완료 기준
- 회원가입 -> 로그인 -> 보호 API 접근 흐름 정상

사용자 결정 포인트
- [ ] 토큰 만료 시간(예: 7일)

---

## Step 4. 지원서/이벤트/문서 API 구현
- [ ] Applications CRUD API
- [ ] Events CRUD API
- [ ] Documents 업로드/삭제 API
- [ ] 입력 검증(Zod) 적용

산출물
- 핵심 도메인 API 완성

완료 기준
- Postman/Thunder Client로 주요 API 정상 응답(200/201/204)

---

## Step 5. 핵심 화면 UI 구현
- [ ] 로그인/회원가입 화면
- [ ] 대시보드 화면(지표 + 다가오는 일정)
- [ ] 칸반 보드 화면(단계 이동)
- [ ] 지원서 등록/상세/수정 화면

산출물
- MVP 주요 사용자 플로우 화면 완성

완료 기준
- 실제 사용자가 브라우저에서 핵심 흐름 수행 가능

---

## Step 6. 파일 업로드/다운로드 구현
- [ ] PDF만 업로드 허용
- [ ] 10MB 제한 검증
- [ ] Supabase Storage 연동

산출물
- 이력서/포트폴리오 업로드 기능

완료 기준
- 업로드/조회/삭제 동작 및 예외 처리 완료

---

## Step 7. 알림(Resend + Cron) 구현
- [ ] D-3 / D-1 이벤트 조회 로직
- [ ] 이메일 템플릿 적용
- [ ] `notified_d3`, `notified_d1` 플래그 갱신
- [ ] Vercel Cron 라우트 구현

산출물
- 일정 리마인드 자동 발송 시스템

완료 기준
- 테스트 이벤트 기준 메일 발송 및 중복 발송 방지 확인

사용자 설정 포인트
- [ ] Resend 도메인 인증 및 발신 이메일 확정

---

## Step 8. 배포 및 최종 검증
- [ ] Vercel 배포
- [ ] 환경변수 세팅(Production/Preview)
- [ ] E2E 수동 점검(회원가입/로그인/등록/이동/알림)
- [ ] 오류 로그 점검

산출물
- 배포된 MVP URL

완료 기준
- 핵심 시나리오 동작 + 배포 후 API 오류 없음

---

## 우선순위(시간 부족 시)
1. 인증 + Applications CRUD
2. 대시보드 + 칸반
3. 파일 업로드
4. 이메일 알림

## 운영 원칙
- 기능 추가보다 안정성을 우선한다.
- 큰 리팩터링보다 작은 단위 완성을 우선한다.
- 모든 변경은 검증 가능한 완료 기준을 가진다.
