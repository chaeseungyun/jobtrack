# JobTrack 크롬 확장 프로그램 — 단계별 작업 체크리스트

> **문서 역할**: 컨텍스트 소실 없이 작업할 수 있도록 단계별로 작업을 분할한다.
> **구현 계획**: `docs/extension/implementation-plan.md` 참조
> **요구사항**: `docs/extension/requirements.md` 참조
> **사용자 플로우**: `docs/extension/flow.md` 참조

---

## 문서 간 관계

```
docs/extension/
├── requirements.md          # 무엇을 만들 것인가 (기능/비기능 요구사항)
├── flow.md                  # 사용자가 어떻게 사용하는가 (Mermaid 플로우)
├── implementation-plan.md   # 어떻게 만들 것인가 (아키텍처, 전략, 재활용 목록)
└── step.md                  # 어떤 순서로 만들 것인가 (작업 단위별 체크리스트)  ← 이 문서
```

## 작업 분할 원칙

- 각 Step은 **하나의 대화에서 완료 가능한 크기**로 제한
- 각 Step 시작 시 읽어야 할 파일 목록 명시 (컨텍스트 복구용)
- 각 Step 완료 조건 명시 (`pnpm build` 성공, 수동 테스트 등)
- Step 간 의존성 명시

## 의존성 그래프

```
Step 1 (Bearer 인증)
  ├── Step 2 (토큰 발급 + 콜백)
  │     └── Step 5 (확장: 기본 구조 + 인증)
  │           └── Step 6 (확장: HTML 추출 + 저장)
  │                 └── Step 7 (마무리)
  └── Step 3 (HTML 파싱 엔드포인트)
        └── Step 6 (확장: HTML 추출 + 저장)
              └── Step 7 (마무리)

Step 4 (openapi.json) ← Step 2, 3 완료 후
```

---

## Step 1: 백엔드 — Bearer 인증 확장

**선행**: 없음

### 컨텍스트 복구

| 읽을 파일 | 이유 |
|-----------|------|
| `src/lib/auth/jwt.ts` | 기존 토큰 서명/검증 로직 파악 |
| `src/lib/auth/request.ts` | 기존 `requireAuth` 함수 구조 파악 |
| `docs/extension/implementation-plan.md` § 1-1 | Bearer 인증 설계 참조 |

### 작업

- [x] `jwt.ts`에 `signExtensionToken(claims: AuthClaims): string` 함수 추가
  - 30일 유효 (`30d`)
  - 기존 `signAuthToken` (7일)과 분리
- [x] `request.ts`에 `extractToken(request: NextRequest)` 헬퍼 추가
  - Cookie 우선 확인 → 없으면 `Authorization: Bearer` 헤더에서 추출
- [x] `requireAuth` 함수가 `extractToken`을 사용하도록 수정
- [x] 기존 테스트 통과 확인

### 완료 조건

- [x] `pnpm build` 성공
- [x] `pnpm test:run` — 기존 테스트 통과
- [x] 기존 웹 Cookie 인증 플로우 영향 없음 확인

---

## Step 2: 백엔드 — 토큰 발급 엔드포인트 + 콜백 페이지

**선행**: Step 1

### 컨텍스트 복구

| 읽을 파일 | 이유 |
|-----------|------|
| `src/lib/auth/jwt.ts` | Step 1에서 추가한 `signExtensionToken` 확인 |
| `src/app/auth/page.tsx` | 기존 로그인 페이지 구조 파악 |
| `src/app/api/auth/login/route.ts` | 기존 로그인 API 구조 파악 |
| `docs/extension/implementation-plan.md` § 1-2, 1-3 | 엔드포인트/콜백 설계 참조 |

### 작업

- [x] `POST /api/auth/extension-token` 엔드포인트 생성
  - 파일: `src/app/api/auth/extension-token/route.ts`
  - Cookie 기반 인증 필요 (로그인 상태에서만 호출)
  - 응답: `{ token: string, expiresAt: string }` (30일 JWT)
- [x] `/auth/extension-callback` 페이지 생성
  - 파일: `src/app/auth/extension-callback/page.tsx` (클라이언트 컴포넌트)
  - 마운트 시 `fetch('/api/auth/extension-token')` 호출하여 토큰 발급 (세션 쿠키 자동 첨부)
  - 응답받은 토큰을 `data-extension-token` 속성으로 DOM에 삽입
  - 확장 프로그램의 content_script(MutationObserver)가 토큰을 읽어가는 브릿지 역할
  - **"로그인 완료! 확장 프로그램 아이콘을 다시 클릭해주세요"** 안내 문구 표시 (팝업은 새 탭이 열리면서 자동 닫힘)
- [x] 기존 로그인 플로우에 `from=extension` 파라미터 처리 추가
  - 로그인 성공 시 `from=extension`이면 `/auth/extension-callback`으로 리다이렉트

### 완료 조건

- [x] `pnpm build` 성공
- [x] 기존 로그인 플로우 영향 없음 확인 (`from` 파라미터 없을 때 기존 동작)
- [x] `/api/auth/extension-token` 수동 호출 시 JWT 응답 확인
- [x] `/auth/extension-callback` 페이지 렌더링 확인

---

## Step 3: 백엔드 — HTML 파싱 엔드포인트

**선행**: Step 1

### 컨텍스트 복구

| 읽을 파일 | 이유 |
|-----------|------|
| `src/lib/core/services/JobParsingService.ts` | 기존 파싱 파이프라인 파악 |
| `src/lib/core/services/llm/OpenAiParsingService.ts` | HTML 전처리 + LLM 파싱 로직 |
| `src/app/api/applications/parse/route.ts` | 기존 URL 파싱 라우트 구조 참조 |
| `src/lib/core/config/adapter.config.ts` | 사이트별 adapter 설정 |
| `docs/extension/implementation-plan.md` § 1-4 | HTML 파싱 엔드포인트 설계 참조 |

### 작업

- [x] `JobParsingService`에 `parseHtml(url: string, html: string)` 메서드 추가
  - 스크래핑 단계 건너뛰고 HTML 정제 → LLM 파싱만 수행
  - `preExtracted: true` 옵션으로 content 셀렉터 추출 단계 스킵
  - 캐시 저장은 기존과 동일 적용
- [x] `POST /api/applications/parse-html` 라우트 생성
  - 파일: `src/app/api/applications/parse-html/route.ts`
  - 인증: `requireAuth` (Cookie 또는 Bearer)
  - 요청 본문: `{ url: string, html: string }`
  - Zod 스키마 추가 (라우트 파일 내 인라인 — 기존 `parse` 라우트와 동일 패턴)
  - 요청 크기 제한: 5MB
- [x] 기존 URL 파싱 엔드포인트(`POST /api/applications/parse`)는 변경 없이 유지

### 완료 조건

- [x] `pnpm build` 성공
- [x] `pnpm test:run` — 기존 테스트 통과 (71 tests passed)
- [x] 기존 URL 파싱 플로우 영향 없음 확인

---

## Step 4: 백엔드 — openapi.json 업데이트

**선행**: Step 2, Step 3

### 컨텍스트 복구

| 읽을 파일 | 이유 |
|-----------|------|
| `public/openapi.json` | 기존 Swagger 스펙 구조 파악 |
| `src/app/api/auth/extension-token/route.ts` | Step 2에서 만든 엔드포인트 |
| `src/app/api/applications/parse-html/route.ts` | Step 3에서 만든 엔드포인트 |

### 작업

- [x] `POST /api/auth/extension-token` 스펙 추가
  - 요청: 없음 (Cookie 인증)
  - 응답: `{ token: string, expiresAt: string }`
- [x] `POST /api/applications/parse-html` 스펙 추가
  - 요청: `{ url: string, html: string }`
  - 응답: 기존 `parse` 엔드포인트와 동일한 형식
  - 인증: Bearer 토큰

### 완료 조건

- [x] `/swagger` 페이지에서 새 엔드포인트 2개 확인
- [x] `pnpm build` 성공

---

## Step 5: 확장 프로그램 — 기본 구조 + 인증 플로우

**선행**: Step 2

### 컨텍스트 복구

| 읽을 파일 | 이유 |
|-----------|------|
| `docs/extension/step.md` | 전체 작업 흐름 복구 |
| `docs/extension/implementation-plan.md` § 2-1, 2-2, 3-1 | 구조/매니페스트/인증 설계 (Service Worker 없는 2-컴포넌트 구조) |
| `docs/extension/flow.md` § 2 | 인증 플로우 다이어그램 |

### 작업

- [x] `extension/` 디렉토리 구조 생성
  ```
  extension/
  ├── manifest.json
  ├── popup/
  │   ├── popup.html
  │   ├── popup.css
  │   └── popup.js
  ├── content/
  │   ├── extractor.js        (빈 파일 — Step 6에서 구현)
  │   └── auth-callback.js
  ├── utils/
  │   ├── config.js
  │   ├── api.js
  │   ├── auth.js
  │   └── sites.js            (빈 파일 — Step 6에서 구현)
  └── icons/
      ├── icon-16.png
      ├── icon-48.png
      └── icon-128.png
  ```
- [x] `manifest.json` 작성
  - permissions: `activeTab`, `storage`, `scripting`
  - host_permissions: 사람인, 잡코리아, JobTrack 도메인, localhost
  - content_scripts: 인증 콜백 페이지에만 `auth-callback.js` (prod + localhost)
- [x] `auth-callback.js` 구현
  - `MutationObserver`로 `data-extension-token` 속성이 DOM에 삽입될 때까지 대기 (content_script는 클라이언트 컴포넌트 fetch 완료보다 먼저 실행되므로 필수)
  - 속성 감지 시 토큰과 만료일을 읽어 `chrome.storage.local`에 직접 저장 (Service Worker 불필요)
  - `window.location.origin`을 `apiBase`로 함께 저장 (실제 콜백 origin으로 최종 동기화)
- [x] `auth.js` 구현
  - `saveToken(token, expiresAt)`, `getValidToken()`, `clearToken()`
- [x] `config.js` 구현
  - `DEV_WEB_ORIGIN`, `PROD_WEB_ORIGIN`, `DEFAULT_WEB_ENV` 상수 분리
  - 인증 시작 전에 사용할 초기 `apiBase` 결정
- [x] `api.js` 기본 구조
  - `getApiBase()` — storage에서 apiBase 조회, 없으면 환경 상수 기반 초기값 사용
  - `ensureApiBase()` — 로그인 시작 전에 `apiBase` 초기화
  - `apiCall(endpoint, options)` — Bearer 토큰 자동 첨부, 401 처리, HTTP/JSON 파싱/네트워크 실패 구분
- [x] `popup.html/css/js` — 로그인 화면 구현
  - ES modules 사용 (`<script type="module">`)
  - 초기화 시 `chrome.storage.local`에서 토큰 확인 → 없거나 만료면 "JobTrack 로그인" 버튼 표시
  - 로그인 클릭 전 `apiBase`를 먼저 결정한 뒤, 새 탭으로 `/auth?from=extension` 열기 (팝업은 자동 닫힘)
  - 사용자가 웹 로그인 완료 후 아이콘 재클릭 → 초기화에서 토큰 확인 → 메인 UI 표시
- [x] 아이콘 생성 (심플 플레이스홀더)

### 완료 조건

- [x] `chrome://extensions` 개발자 모드에서 로드 성공 (에러 없음)
- [x] 팝업 열기 → 로그인 버튼 표시 확인
- [x] 로그인 버튼 클릭 → 현재 환경(origin) 기준 JobTrack 로그인 페이지 새 탭 열림
- [x] 로그인 완료 → 콜백 페이지 → 토큰 수신 → 팝업 메인 UI 전환 수동 확인

---

## Step 6: 확장 프로그램 — HTML 추출 + 저장 플로우

**선행**: Step 3, Step 5

> 작업량이 많아 4개 서브스텝으로 세분화. 각 서브스텝은 독립적으로 완료 가능하며, 순서대로 진행한다.

---

### Step 6-1: 기반 레이어 — 사이트 판별 + API 래퍼 확장

**목표**: 팝업이 현재 탭이 지원 사이트인지 판별하고, 저장/파싱 API 함수를 준비한다.

#### 컨텍스트 복구

| 읽을 파일 | 이유 |
|-----------|------|
| `src/lib/core/config/adapter.config.ts` | 사이트별 content/remove 셀렉터 동기화 기준 |
| `extension/utils/api.js` | 기존 `apiCall` 래퍼 구조 파악 |
| `extension/popup/popup.js` | 현재 view-main 분기 위치 확인 |
| `extension/popup/popup.html` | 기존 뷰 구조 확인 |

#### 작업

- [x] `extension/utils/sites.js` 구현
  - `SITE_CONFIGS` 객체 — `adapter.config.ts`의 `saramin.co.kr`, `jobkorea.co.kr`, `generic`을 JS 객체로 그대로 포팅
    - 각 항목: `{ hostname, content: string[], remove: string[] }`
  - `matchSite(url)` — URL의 hostname을 순회하여 매칭되는 config 반환, 없으면 `null`
  - `isSupportedSite(url)` — `matchSite` 결과가 non-null이고 generic이 아닌 경우 `true`
- [x] `extension/utils/api.js`에 두 함수 추가
  - `parseHtml(url, html)` — `apiCall('/api/applications/parse-html', { method: 'POST', body: { url, html } })`
  - `createApplication(data)` — `apiCall('/api/applications', { method: 'POST', body: data })`
    - `data` 필드: `company_name`, `position`, `career_type`, `job_url`, `source`, `deadline` (nullable)
- [x] `extension/popup/popup.html`에 view-main 내부 요소 보강
  - `#btn-save` 버튼 ("이 공고 저장하기") — 초기 `hidden`
  - `#unsupported-msg` 단락 ("지원하지 않는 사이트입니다") — 초기 `hidden`
- [x] `extension/popup/popup.js`의 `init()` 내 view-main 분기 처리
  - `isSupportedSite(url)` → `true`면 `#btn-save` 표시, `false`면 `#unsupported-msg` 표시
  - `#site-status` 텍스트는 사이트명 표시 (예: "사람인", "잡코리아") 또는 "미지원 사이트"

#### 완료 조건

- [x] 사람인/잡코리아 공고 URL에서 팝업 열면 "이 공고 저장하기" 버튼 표시
- [x] 그 외 사이트에서 팝업 열면 "지원하지 않는 사이트" 안내 표시, 버튼 숨김
- [x] `chrome://extensions`에서 확장 로드 시 에러 없음 확인

---

### Step 6-2: HTML 추출 파이프라인 — `extractor.js`

**목표**: 버튼 클릭 시 현재 페이지에서 공고 HTML을 추출하여 파싱 API를 호출하고, 로딩 상태를 표시한다.

#### 컨텍스트 복구

| 읽을 파일 | 이유 |
|-----------|------|
| `docs/extension/flow.md` § 3 | HTML 추출 4단계 파이프라인 다이어그램 |
| `docs/extension/flow.md` § 6 | 팝업-Content Script 통신 시퀀스 |
| `extension/utils/sites.js` | Step 6-1에서 만든 사이트 config |
| `extension/utils/api.js` | Step 6-1에서 추가한 `parseHtml` |
| `extension/popup/popup.js` | `#btn-save` 핸들러 추가 위치 |

#### 작업

- [x] `extension/content/extractor.js` 구현 — `extractJobHtml(siteConfig)` 함수
  - **Stage 1**: 실제 DOM에서 `siteConfig.content` 셀렉터로 컨테이너 후보 검색
    - 0개: `generic` config의 `content` 셀렉터로 fallback (`main → article → #content → body` 순)
    - 1개: 해당 컨테이너 바로 추출
    - 2개+: 각 컨테이너에 `getBoundingClientRect` 적용 → 뷰포트 내 노출 비율(`visibleHeight / viewportHeight`) 최대인 것 선택, 나머지는 `alternatives` 배열에 보관
  - **Stage 2**: 선택된 컨테이너와 alternatives를 `cloneNode(true)`로 복제
  - **Stage 3**: clone에서 `script`, `style`, `noscript`, `iframe`, `svg`와 `siteConfig.remove` 셀렉터 목록 순회 제거
  - **Stage 4**: clone의 모든 요소에서 `style`, `class`, `id`, `data-*` 속성 제거 (태그 구조와 텍스트만 유지)
  - 반환값: `{ html: string, title: string, alternatives: Array<{ html: string, title: string }> }`
    - `title`: 컨테이너 내 첫 번째 `h1 | h2 | h3` 텍스트, 없으면 `document.title` 앞 30자
- [x] `extension/popup/popup.js`에 `#btn-save` 클릭 핸들러 추가
  - `showView('loading')` 전환
  - `chrome.scripting.executeScript({ target: { tabId }, func: extractJobHtml, args: [siteConfig] })` 실행
  - 반환값 `{ html, title, alternatives }` 수신
  - `parseHtml(tab.url, html, { bypassCache: true })` 호출
  - 성공/실패 결과는 HTML 본문 없이 요약 로그로 출력 (뷰 전환은 Step 6-3에서 구현)
  - 실패 시 `showView('main')`으로 롤백

#### 완료 조건

- [x] 사람인 공고 페이지에서 버튼 클릭 → 로딩 뷰 전환 → 파싱 API 응답 콘솔 출력
- [x] 잡코리아 공고 페이지에서 동일 동작 확인
- [x] `alternatives` 배열이 공고가 1개인 경우 빈 배열, 여러 개인 경우 나머지 컨테이너 포함 확인

---

### Step 6-3: 확인 + 편집 + 저장 뷰

**목표**: 파싱 결과를 사용자에게 보여주고, 편집 후 지원서를 저장하는 E2E 플로우를 완성한다.

#### 컨텍스트 복구

| 읽을 파일 | 이유 |
|-----------|------|
| `docs/extension/flow.md` § 1 | 전체 플로우 다이어그램 (confirm → form → success 경로) |
| `docs/extension/flow.md` § 5 | 팝업 UI 상태 전이 다이어그램 |
| `src/lib/validation/step4.ts` | `createApplicationSchema` — 저장 API 필드 확인 |
| `extension/popup/popup.html` | 기존 뷰 구조 (뷰 추가 위치) |
| `extension/popup/popup.js` | Step 6-2까지의 저장 핸들러 |
| `extension/utils/api.js` | `createApplication` 함수 |

#### 작업

- [ ] `extension/popup/popup.html`에 뷰 3개 추가 (초기 `hidden`)
  - `#view-confirm`: 공고 제목(`#confirm-title`) + "맞아요" 버튼(`#btn-confirm`) + "다른 공고" 버튼(`#btn-other`) — Step 6-4에서 연결
  - `#view-form`: 편집 폼
    - 필드: `#field-company`(회사명), `#field-position`(포지션), `#field-career-type`(경력구분 select: `신입|경력|무관`), `#field-deadline`(마감일 date input), `#field-source`(출처 — 사이트명 자동 입력), `#field-url`(공고 URL — 현재 탭 URL 자동 입력)
    - "저장" 버튼(`#btn-submit`), "취소" 버튼(`#btn-cancel`)
  - `#view-success`: 성공 메시지 + "JobTrack에서 보기" 링크(`#link-view`, `target="_blank"`)
- [ ] `extension/popup/popup.js` 뷰 전환 로직 완성
  - `parseHtml` 성공 → `#confirm-title`에 파싱된 `position` 또는 company/position 조합 표시 → `showView('confirm')`
  - `parseHtml` 실패 → `showView('main')` 롤백 + `#site-status`에 오류 메시지 표시
  - `#btn-confirm` 클릭 → 파싱 결과로 폼 필드 자동 채움 → `showView('form')`
    - `#field-url`: 현재 탭 URL
    - `#field-source`: `matchSite(url).hostname` 기반 사이트명 ("사람인" | "잡코리아")
    - 나머지: 파싱 결과 필드 그대로 매핑
  - `#btn-cancel` 클릭 → `showView('main')`
  - `#btn-submit` 클릭 → 폼 값 수집 → `createApplication(data)` 호출
    - 성공 → `#link-view` href 구성(`${apiBase}/applications/${id}`) → `showView('success')`
    - 실패 → `#site-status` 영역에 오류 문구 표시, 폼 유지

#### 완료 조건

- [ ] 사람인 공고 → 저장하기 → 파싱 → 확인 화면 → 폼 자동 채움 → 저장 → 성공 화면 E2E 통과
- [ ] 잡코리아 동일 E2E 통과
- [ ] JobTrack 웹(`/applications`)에서 저장된 지원서 확인

---

### Step 6-4: 다른 공고 선택 (alternatives)

**목표**: 뷰포트 감지 결과가 틀렸을 때 사용자가 수동으로 공고를 선택할 수 있도록 한다.

#### 컨텍스트 복구

| 읽을 파일 | 이유 |
|-----------|------|
| `docs/extension/flow.md` § 4 | 다른 공고 선택 플로우 다이어그램 |
| `extension/popup/popup.html` | 뷰 추가 위치 |
| `extension/popup/popup.js` | `#btn-other` 핸들러 추가 위치, `alternatives` 데이터 접근 |

#### 작업

- [ ] `extension/popup/popup.html`에 `#view-alternatives` 뷰 추가 (초기 `hidden`)
  - `#alternatives-list` — 동적으로 항목을 주입할 `<ul>` 컨테이너
  - "돌아가기" 버튼(`#btn-back-to-confirm`)
- [ ] `extension/popup/popup.js`에 alternatives 플로우 연결
  - `#btn-other` 클릭 시:
    - `alternatives`가 빈 배열이면 `#site-status`에 "다른 공고를 찾을 수 없습니다" 표시 후 유지
    - `alternatives`가 있으면 `#alternatives-list`를 동적 생성 — 각 항목은 `<li>` 버튼으로 `alt.title` 표시
    - `showView('alternatives')`
  - 목록 항목 클릭 → 해당 `alt.html`로 `parseHtml(tab.url, alt.html)` 재호출 → `showView('loading')` → 파싱 결과로 `showView('confirm')` 업데이트
  - `#btn-back-to-confirm` 클릭 → `showView('confirm')`

#### 완료 조건

- [ ] 공고가 2개 이상 감지되는 페이지에서 "다른 공고" 클릭 → alternatives 목록 표시
- [ ] 목록에서 선택 → 재파싱 → confirm 화면 업데이트 정상 동작
- [ ] alternatives가 없을 때 적절한 안내 표시

---

## Step 7: 마무리 — 에러 핸들링 + UI 폴리싱

**선행**: Step 6

### 컨텍스트 복구

| 읽을 파일 | 이유 |
|-----------|------|
| `docs/extension/step.md` | 전체 작업 흐름 복구 |
| `docs/extension/requirements.md` § 4 | 비기능 요구사항 (NFR) 확인 |
| `docs/extension/flow.md` § 5 | 팝업 UI 상태 전이 다이어그램 |
| `extension/popup/popup.js` | Step 6 결과물 |
| `extension/popup/popup.css` | 현재 스타일 상태 |

### 작업

- [ ] 에러 상태 통합 처리
  - 네트워크 에러 → "연결할 수 없습니다. 인터넷 연결을 확인해주세요."
  - 401 Unauthorized → 토큰 삭제 + 재로그인 유도
  - 파싱 실패 (500) → "분석에 실패했습니다. 다시 시도해주세요." + 재시도 버튼
  - 저장 실패 → "저장에 실패했습니다." + 재시도 버튼
  - 타임아웃 (파싱 5초+) → "시간이 걸리고 있습니다..." 안내 텍스트
- [ ] UI 디자인 톤 맞춤
  - JobTrack 웹과 일관된 색상/폰트/간격
  - 로딩 스피너 디자인
  - 성공/에러 토스트 디자인
  - 폼 필드 스타일링
- [ ] 엣지 케이스 처리
  - 팝업 열었다 닫았다 재열기 시 상태 초기화
  - 동일 URL 중복 저장 시도 처리
  - 매우 긴 HTML (5MB 초과) 전송 시 클라이언트 사이드 경고
  - content 셀렉터 모두 실패 시 사용자 안내

### 완료 조건

- [ ] 전체 통합 테스트 통과 (로그인 → 저장 → 확인 E2E)
- [ ] 오프라인 상태에서 적절한 에러 메시지 표시
- [ ] 토큰 만료 상태에서 재로그인 유도 정상 동작
- [ ] `pnpm build` 성공 (서버 측 변경 포함)
