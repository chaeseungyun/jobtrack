# JobTrack 크롬 확장 프로그램 — 요구사항 정의서

> **문서 역할**: 크롬 확장 프로그램의 기능/비기능 요구사항을 상세히 정의한다.
> **상위 문서**: `docs/prd.md` § 3.7
> **기술 설계**: `docs/extension/implementation-plan.md` 참조

---

## 1. 제품 개요

- **이름**: JobTrack Chrome Extension
- **목적**: 채용 공고 페이지에서 컨텍스트 스위칭 없이 지원서를 바로 기록. JobTrack 웹은 개인 대시보드(백오피스) 역할에 집중.
- **Manifest**: V3 (Chrome, Edge, Brave 등 Chromium 기반 브라우저 호환)
- **배포**: Chrome Web Store

---

## 2. 기능 요구사항

### FR-1. 인증

| ID | 요구사항 |
|----|---------|
| FR-1.1 | 미로그인 상태에서 팝업 열면 "JobTrack 로그인" 버튼을 표시한다 |
| FR-1.2 | 버튼 클릭 시 확장 프로그램이 사용할 웹 origin을 먼저 결정한 뒤, 해당 origin의 JobTrack 로그인 페이지(`/auth?from=extension`)를 새 탭으로 연다 |
| FR-1.3 | 웹에서 로그인 완료 후 확장 프로그램 전용 토큰(30일 유효)을 발급하고, 콜백 페이지를 통해 확장 프로그램에 전달한다 |
| FR-1.4 | 토큰은 `chrome.storage.local`에 저장하고, API 호출 시 `Authorization: Bearer` 헤더로 사용한다 |
| FR-1.5 | 로그인 상태에서 팝업 하단에 로그아웃 버튼을 제공한다 |
| FR-1.6 | 토큰 만료 시 팝업에서 재로그인을 안내한다 |

### FR-2. 공고 저장 (핵심 플로우)

| ID | 요구사항 |
|----|---------|
| FR-2.1 | 로그인 상태에서 팝업 열면 현재 탭의 URL과 함께 "이 공고 저장하기" 버튼을 표시한다 |
| FR-2.2 | 버튼 클릭 시 `content_script`가 사이트별 adapter config의 셀렉터를 사용하여 현재 페이지에서 공고 본문 영역만 추출한다 (전체 HTML 전송 금지) |
| FR-2.3 | 추출한 HTML(정제 후)과 URL을 서버의 HTML 파싱 엔드포인트(`POST /api/applications/parse-html`)로 전송한다 |
| FR-2.4 | 파싱 결과(회사명, 포지션, 마감일, 경력구분, 출처 등)를 팝업 내 편집 가능한 폼에 표시한다 |
| FR-2.5 | 사용자가 파싱 결과를 확인/수정한 후 "저장" 버튼으로 최종 저장한다 (`POST /api/applications`) |
| FR-2.6 | 저장 성공 시 팝업 내 성공 토스트 + "JobTrack에서 보기" 링크를 표시한다 |
| FR-2.7 | 저장 실패 시 팝업 내 오류 토스트와 재시도 안내를 표시한다 |
| FR-2.8 | 파싱 중 로딩 상태(스피너 + "분석 중..." 텍스트)를 표시한다 |

### FR-3. 대상 사이트

| ID | 요구사항 |
|----|---------|
| FR-3.1 | MVP에서는 사람인(`saramin.co.kr`), 잡코리아(`jobkorea.co.kr`) 공고 페이지를 지원한다 |
| FR-3.2 | 지원되지 않는 사이트에서는 팝업에 "지원되지 않는 사이트입니다" 안내를 표시한다 |
| FR-3.3 | 지원 사이트 목록은 확장 프로그램 내에서 관리한다 (서버 의존 없음) |

---

## 3. 백엔드 변경 요구사항

| ID | 요구사항 |
|----|---------|
| BE-1 | 확장 프로그램용 토큰 발급 엔드포인트 추가 — 로그인 성공 시 30일 유효 JWT를 응답 본문에 포함 |
| BE-2 | 기존 cookie 기반 인증과 병행하여 `Authorization: Bearer` 헤더 기반 인증 지원 추가 |
| BE-3 | HTML 직접 수신 파싱 엔드포인트 추가 (`POST /api/applications/parse-html`) — URL + HTML 본문을 받아 정제 → OpenAI 파싱. ScrapingBee 미사용 |
| BE-4 | 기존 URL 파싱 엔드포인트(`POST /api/applications/parse`)는 변경 없이 유지 |
| BE-5 | 확장 프로그램 인증 콜백 페이지 추가 (`/auth/extension-callback`) — 클라이언트 컴포넌트로 구현. 마운트 시 `/api/auth/extension-token` fetch 호출하여 토큰 발급 후, DOM에 삽입하여 content_script에 전달하는 브릿지 역할 |

---

## 4. 비기능 요구사항

| ID | 항목 | 요구사항 |
|----|------|---------|
| NFR-1 | 보안 | 토큰은 `chrome.storage.local`에만 저장. `auth-callback.js` content_script가 저장을 담당하며, 공고 추출용 `extractor.js`에는 토큰을 노출하지 않음 |
| NFR-2 | 보안 | HTML 전송 시 셀렉터로 추출한 공고 본문 영역만 전송. 쿠키, 로컬스토리지 등 민감 정보 미포함 |
| NFR-3 | 보안/성능 | HTML 파싱 엔드포인트에 요청 크기 제한 설정 (최대 5MB). 클라이언트 사이드 정제로 실제 전송 크기는 50~200KB 수준 |
| NFR-4 | 보안 | Chrome Web Store 등록 기준 충족 — 권한 최소화 원칙 (`activeTab`, `storage`, 대상 사이트 host_permissions만) |
| NFR-5 | 성능 | 파싱 요청~결과 표시까지 5초 이내 (OpenAI 호출 포함) |
| NFR-6 | 호환 | Manifest V3, Chromium 기반 브라우저 호환 (Chrome, Edge, Brave) |
| NFR-7 | UX | 팝업 UI는 JobTrack 웹과 일관된 디자인 톤 (색상, 폰트) 유지 |
| NFR-8 | 인증 | 확장 프로그램 토큰 유효기간 30일, 만료 시 재로그인 유도 |
| NFR-9 | 개인정보 | Chrome Web Store 등록 시 개인정보처리방침 페이지 필요 |
| NFR-10 | 신뢰성 | API 래퍼는 HTTP 실패, JSON 파싱 실패, 네트워크 실패를 구분하여 반환한다 |

---

## 5. 범위 외 (Out of Scope — MVP)

- 모든 웹사이트 범용 지원 (MVP 이후 HTML 직접 전송 방식의 범용성 검증 후 검토)
- 페이지 내 플로팅 버튼 주입
- 브라우저 Notification API 알림
- 이미 저장된 공고 중복 감지/표시
- 사이드패널 UI
- 저장 시 메모/단계 선택 (기본값: `interest` 단계로 저장)
