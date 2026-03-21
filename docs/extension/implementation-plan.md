# JobTrack 크롬 확장 프로그램 — 구현 계획

> **문서 역할**: 크롬 확장 프로그램 MVP의 기술 구현 계획.
> **요구사항**: `docs/extension/requirements.md` 참조
> **작업 단계**: `docs/extension/step.md` 참조
> **상태**: 확정

---

## 0. 프로젝트 구조 결정: 모노레포

확장 프로그램은 기존 JobTrack 저장소 내 `extension/` 디렉토리에서 관리한다 (모노레포).

**근거**:
- 서버의 adapter config(`src/lib/core/config/adapter.config.ts`)와 확장 프로그램의 사이트 설정을 **동일 저장소에서 동기화**해야 한다. 별도 저장소면 설정이 분리되어 불일치 리스크가 높아진다.
- 확장 프로그램은 Vanilla JS로 구현하므로 서버의 빌드 파이프라인과 충돌하지 않는다.
- 백엔드 API 변경과 확장 프로그램 변경을 하나의 PR로 관리할 수 있다.
- Chrome Web Store 배포는 `extension/` 디렉토리만 zip으로 패키징하면 된다.

**저장소 구조**:
```
jobtrack/                      # 기존 Next.js 프로젝트 (루트)
├── src/                       # 서버 + 웹
├── extension/                 # 크롬 확장 프로그램 (독립 빌드)
│   ├── manifest.json
│   ├── ...
│   └── README.md
├── package.json               # 서버용 (extension은 의존성 없음)
└── ...
```

**규칙**:
- `extension/`은 서버의 `node_modules`, 빌드, 린트 설정에 포함하지 않는다.
- `extension/`에는 별도의 `package.json`을 두지 않는다 (순수 Vanilla JS, 의존성 없음).
- `.gitignore`에 `extension/` 빌드 산출물은 별도 관리 불필요 (빌드 과정 없음).

---

## 1. 전체 아키텍처

### 컴포넌트 역할

| 컴포넌트 | 역할 | 비고 |
|----------|------|------|
| **Popup** | UI 표시 + API 직접 호출 | 인증 상태 확인, 파싱/저장 API 호출, 폼 표시 |
| **Service Worker** | 인증 콜백 수신만 | content_script → `chrome.runtime.sendMessage` → storage 저장 |
| **Content Script** | HTML 추출 (`extractor.js`) + 인증 콜백 (`auth-callback.js`) | `activeTab` + `scripting` 권한으로 온디맨드 실행 |

> **설계 원칙**: Service Worker 역할 최소화. API 호출은 popup에서 직접 수행한다. Service Worker는 인증 콜백 토큰 수신 및 `chrome.storage.local` 저장만 담당한다. 이렇게 하면 Service Worker 비활성화에 따른 API 호출 실패 문제가 없고, popup 코드에서 상태 관리가 단순해진다.

```
┌─────────────────────────────────────────────────────┐
│  Chrome Extension (Manifest V3)                     │
│                                                     │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │  Popup   │  │  Background  │  │Content Script │ │
│  │  (UI +   │  │  (Service    │  │ (HTML 추출 +  │ │
│  │  API호출) │  │   Worker)   │  │  인증 콜백)   │ │
│  └─────┬────┘  └──────────────┘  └───────────────┘ │
│        │        인증 콜백만 수신                      │
└────────┼────────────────────────────────────────────┘
         │ Authorization: Bearer <token>
         ▼
┌─────────────────────────────────────────────────────┐
│  JobTrack Server (Next.js)                          │
│                                                     │
│  ┌─────────────────────┐  ┌──────────────────────┐ │
│  │ POST /api/apps/     │  │ POST /api/apps/      │ │
│  │   parse-html   [NEW]│  │   (기존 생성)        │ │
│  └─────────┬───────────┘  └──────────────────────┘ │
│            │                                        │
│  ┌─────────▼───────────┐                            │
│  │ OpenAiParsingService│ (ScrapingBee 미사용)       │
│  └─────────────────────┘                            │
└─────────────────────────────────────────────────────┘
```

---

## 2. 구현 단계

### Phase 1: 백엔드 변경 (서버)

확장 프로그램 개발 전 서버 API를 먼저 준비한다.

#### 1-1. Bearer 토큰 인증 지원 추가

**변경 파일**: `src/lib/auth/jwt.ts`, `src/lib/auth/request.ts`

- `jwt.ts`에 확장 프로그램용 토큰 발급 함수 추가:
  - `signExtensionToken(claims: AuthClaims): string` — 30일 유효
  - 기존 `signAuthToken`(7일)과 분리하여 관리
- `request.ts`의 `requireAuth` 함수 수정:
  - 기존: cookie에서만 토큰 추출
  - 변경: cookie 우선 확인 → 없으면 `Authorization: Bearer` 헤더에서 추출
  - 인증 로직(검증)은 동일하게 `verifyAuthToken` 사용

```typescript
// request.ts 수정 의사코드
function extractToken(request: NextRequest): string | null {
  // 1. Cookie에서 추출 (기존 웹 호환)
  const cookieToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (cookieToken) return cookieToken;

  // 2. Authorization 헤더에서 추출 (확장 프로그램)
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return null;
}
```

#### 1-2. 확장 프로그램 인증 토큰 발급 엔드포인트

**새 파일**: `src/app/api/auth/extension-token/route.ts`

- `POST /api/auth/extension-token`
- 기존 웹 세션(cookie) 인증 필요 → 로그인된 상태에서 호출
- 응답: `{ token: string, expiresAt: string }`
- 30일 유효 JWT 발급

#### 1-3. 확장 프로그램 인증 콜백 페이지

**새 파일**: `src/app/auth/extension-callback/page.tsx`

- 웹 로그인 완료 후 리다이렉트되는 페이지
- 서버에서 확장 프로그램용 토큰을 발급받아 표시
- 확장 프로그램이 이 페이지에 주입한 content_script를 통해 토큰을 전달받음
- 플로우:
  1. 확장 프로그램 → `/auth?from=extension` 새 탭 열기
  2. 사용자 로그인 완료
  3. `/auth/extension-callback`으로 리다이렉트
  4. 페이지가 `/api/auth/extension-token` 호출하여 토큰 발급
  5. 페이지에 토큰을 `data-extension-token` 속성으로 삽입
  6. content_script가 토큰을 읽어 `chrome.runtime.sendMessage`로 background에 전달
  7. background가 `chrome.storage.local`에 저장

#### 1-4. HTML 파싱 엔드포인트

**새 파일**: `src/app/api/applications/parse-html/route.ts`

- `POST /api/applications/parse-html`
- 인증: `requireAuth` (cookie 또는 Bearer 토큰)
- 요청 본문: `{ url: string, html: string }`
- 요청 크기 제한: 5MB
- 처리 파이프라인:
  1. URL에서 source 추론 (`inferSourceFromUrl`)
  2. URL에서 adapter config 조회 (`resolveAdapterConfig`)
  3. **ScrapingBee 호출 생략** — 전달받은 HTML을 직접 사용
  4. `OpenAiParsingService.parse(html, config)` 호출
  5. 기존 URL 파싱과 동일한 응답 형식 반환
- 캐시: URL 기반으로 기존 캐시 로직 동일 적용

**기존 파일 변경**: `src/lib/core/services/JobParsingService.ts`

- `parseHtml(url: string, html: string)` 메서드 추가
- 스크래핑 단계를 건너뛰고 HTML 정제 → LLM 파싱만 수행
- 캐시 저장은 동일하게 적용

---

### Phase 2: 크롬 확장 프로그램 구조

#### 2-1. 프로젝트 구조

```
extension/                     # 모노레포 내 독립 디렉토리 (빌드 도구 없음)
├── manifest.json
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js              # 팝업 UI 로직
├── background/
│   └── service-worker.js     # 인증 콜백 수신만 (API 호출은 popup에서 직접)
├── content/
│   ├── extractor.js          # 공고 페이지 HTML 추출 (셀렉터 기반 정제)
│   └── auth-callback.js      # 인증 콜백 페이지 토큰 전달
├── utils/
│   ├── api.js                # API 호출 래퍼
│   ├── auth.js               # 토큰 저장/조회/만료 확인
│   └── sites.js              # 사이트별 config (adapter.config.ts와 동기화)
├── icons/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
└── README.md
```

#### 2-2. manifest.json 설계

```json
{
  "manifest_version": 3,
  "name": "JobTrack - 채용 공고 저장",
  "version": "1.0.0",
  "description": "채용 공고를 한 번의 클릭으로 JobTrack에 저장합니다.",
  "permissions": [
    "activeTab",
    "storage",
    "scripting"
  ],
  "host_permissions": [
    "https://*.saramin.co.kr/*",
    "https://*.jobkorea.co.kr/*",
    "https://<JOBTRACK_DOMAIN>/*"
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "background": {
    "service_worker": "background/service-worker.js"
  },
  "content_scripts": [
    {
      "matches": [
        "https://<JOBTRACK_DOMAIN>/auth/extension-callback*"
      ],
      "js": ["content/auth-callback.js"]
    }
  ],
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

**권한 최소화 설계**:
- `activeTab`: 사용자가 팝업 클릭 시에만 현재 탭에 접근 (전체 탭 권한 불필요)
- `storage`: 토큰 저장용
- `scripting`: `chrome.scripting.executeScript`로 extractor.js 온디맨드 실행에 필요
- `host_permissions`: 대상 사이트 + JobTrack 서버만
- content_script 자동 주입은 인증 콜백 페이지에만 적용
- 공고 페이지 HTML 추출은 `activeTab` + `scripting` + `chrome.scripting.executeScript`로 온디맨드 실행

---

### Phase 3: 핵심 플로우 구현

#### 3-1. 인증 플로우

```
사용자                  팝업              Background          JobTrack 웹
  │                     │                    │                    │
  │── 팝업 열기 ────────→│                    │                    │
  │                     │── 토큰 확인 ──────→│                    │
  │                     │←── 토큰 없음 ──────│                    │
  │                     │── "로그인" 표시 ──→│                    │
  │── 로그인 클릭 ──────→│                    │                    │
  │                     │── 새 탭 열기 ─────→│                    │
  │                     │                    │── /auth?from=ext ─→│
  │                     │                    │                    │── 로그인 폼
  │── 로그인 완료 ──────────────────────────────────────────────→│
  │                     │                    │                    │── /auth/extension-callback
  │                     │                    │                    │── 토큰 발급
  │                     │                    │←── content_script ─│── 토큰 전달
  │                     │                    │── storage 저장 ───→│
  │                     │←── 로그인 완료 ────│                    │
  │                     │── 메인 UI 표시 ──→│                    │
```

#### 3-2. 공고 저장 플로우

> Popup이 API를 직접 호출한다. Service Worker는 이 플로우에 관여하지 않는다.

```
사용자                  팝업                                  서버
  │                     │                                      │
  │── 팝업 열기 ────────→│                                      │
  │                     │── 현재 탭 URL 확인 (chrome.tabs)      │
  │                     │── 사이트 매칭 (sites.js)              │
  │                     │── "저장하기" 표시 ─→│                  │
  │── 저장 클릭 ────────→│                                      │
  │                     │── executeScript (extractor.js) ──→ (현재 탭)
  │                     │←── { html, alternatives } ───────────│
  │                     │── 로딩 표시                            │
  │                     │── POST /api/apps/parse-html ────────→│
  │                     │                                      │── OpenAI 파싱
  │                     │←── 파싱 결과 ────────────────────────│
  │                     │── 확인 화면 ("이 공고가 맞나요?")      │
  │── 확인/수정 ────────→│                                      │
  │                     │── POST /api/applications ───────────→│
  │                     │←── 201 Created ─────────────────────│
  │                     │── 성공 토스트 ──→│                    │
```

#### 3-3. 팝업 UI 상태 머신

```
[초기화]
  │
  ├── 토큰 없음/만료 → [로그인 화면]
  │                       │── "JobTrack 로그인" 버튼
  │                       └── "대시보드도 확인해보세요" 안내 문구
  │
  └── 토큰 유효 ──→ [URL 확인]
                       │
                       ├── 지원 사이트 아님 → [미지원 안내]
                       │                       └── "사람인, 잡코리아에서 이용해주세요"
                       │
                       └── 지원 사이트 ──→ [저장 준비]
                                            │── 현재 URL 표시
                                            └── "이 공고 저장하기" 버튼
                                                  │
                                                  └── 클릭 → [파싱 중] (로딩)
                                                               │
                                                               ├── 성공 → [편집 폼]
                                                               │           │── 회사명
                                                               │           │── 포지션
                                                               │           │── 경력구분
                                                               │           │── 마감일
                                                               │           │── 출처 (자동)
                                                               │           └── "저장" 버튼
                                                               │                 │
                                                               │                 └── [저장 완료]
                                                               │                      │── 성공 토스트
                                                               │                      └── "JobTrack에서 보기" 링크
                                                               │
                                                               └── 실패 → [오류 표시]
                                                                           └── 재시도 버튼
```

---

### Phase 4: 세부 구현 명세

#### 4-1. HTML 전달 전략 — 클라이언트 사이드 추출 (핵심)

전체 페이지 HTML을 서버로 보내는 것은 비효율적이다. 헤더, 사이드바, 푸터, 광고 등 불필요한 요소가 대부분이다. **확장 프로그램(content_script)에서 필요한 영역만 추출하여 전송한다.**

##### 설계 원칙

서버의 `adapter.config.ts`와 동일한 셀렉터 체계를 확장 프로그램에서 재사용한다.

```
서버 (adapter.config.ts)              확장 프로그램 (sites.js)
┌──────────────────────┐              ┌──────────────────────┐
│ "saramin.co.kr": {   │    동기화    │ saramin: {           │
│   content: [".wrap_  │ ←─────────→ │   content: [".wrap_  │
│     jv_cont"],       │              │     jv_cont"],       │
│   remove: ["script", │              │   remove: ["script", │
│     ".wrap_recommend │              │     ".wrap_recommend │
│     _slide"]         │              │     _slide"]         │
│ }                    │              │ }                    │
└──────────────────────┘              └──────────────────────┘
```

> **동기화 방식**: 수동 동기화 (MVP). 두 파일을 동일 저장소(모노레포)에서 관리하므로 PR 리뷰 시 불일치를 방지한다. 이후 공통 JSON으로 추출하여 자동화를 검토한다.

##### 추출 파이프라인 — 4단계 정제 (content_script에서 실행)

```
[현재 페이지 DOM]
      │
      ▼
  ① 노이즈 태그 제거 (공통)
     - script, style, noscript, iframe, svg, link[rel=stylesheet]
     - 모든 사이트에 공통 적용
      │
      ▼
  ② remove 셀렉터로 사이트별 불필요 요소 제거
     - adapter config의 remove 배열 사용
     - 광고, 추천 슬라이드, 네비게이션 등
      │
      ▼
  ③ content 셀렉터로 핵심 영역 추출 + 뷰포트 감지
     - content 셀렉터 매칭 → querySelectorAll
     - 매칭 결과 수에 따라 분기:
       · 0개 → generic fallback (main > article > #content > body)
       · 1개 → 해당 컨테이너 사용
       · 2개+ → 뷰포트 감지 (getBoundingClientRect 기반 노출 비율 계산)
                최고 비율 컨테이너 선택 + alternatives 목록 반환
      │
      ▼
  ④ 속성 정제
     - 불필요한 HTML 속성 제거 (style, class, data-*, id 등은 유지)
     - 빈 텍스트 노드 정리
     - 최종 outerHTML 반환
```

##### 뷰포트 감지 로직

한 페이지에 동일 content 셀렉터에 매칭되는 컨테이너가 2개 이상일 때 (예: 목록 페이지에서 여러 공고), 사용자가 **현재 보고 있는** 공고를 자동으로 판별한다.

```javascript
function selectByViewport(containers) {
  let best = { el: null, ratio: -1 };
  const vpHeight = window.innerHeight;

  for (const el of containers) {
    const rect = el.getBoundingClientRect();
    const visibleTop = Math.max(0, rect.top);
    const visibleBottom = Math.min(vpHeight, rect.bottom);
    const visibleHeight = Math.max(0, visibleBottom - visibleTop);
    const ratio = visibleHeight / rect.height;

    if (ratio > best.ratio) {
      best = { el, ratio };
    }
  }

  return best.el;
}
```

**"다른 공고" 폴백**: 뷰포트 감지 결과가 틀릴 수 있으므로, 파싱 후 확인 화면에서 "다른 공고" 버튼을 제공한다. 클릭 시 alternatives 목록(각 컨테이너에서 추출한 제목)을 표시하고, 사용자가 선택한 컨테이너로 재파싱한다.

##### 사이트별 설정 + 추출 로직 (utils/sites.js)

```javascript
// 서버의 adapter.config.ts와 동기화 유지
const SITE_CONFIGS = {
  "saramin.co.kr": {
    name: "사람인",
    source: "saramin",
    content: [".wrap_jv_cont"],
    remove: ["script", "style", "noscript", "iframe", ".wrap_recommend_slide"],
  },
  "jobkorea.co.kr": {
    name: "잡코리아",
    source: "jobkorea",
    content: ["._1v41msv0"],
    remove: ["script", "style", "noscript", "iframe", "button"],
  },
};

const GENERIC_CONFIG = {
  content: ["main", "article", "#content", "body"],
  remove: ["script", "style", "noscript", "iframe"],
};

// URL → 사이트 config 매칭
function matchSite(url) {
  const hostname = new URL(url).hostname;
  for (const [domain, config] of Object.entries(SITE_CONFIGS)) {
    if (hostname.includes(domain)) return config;
  }
  return null;
}
```

##### HTML 추출 함수 (content/extractor.js)

```javascript
// popup에서 chrome.scripting.executeScript로 실행
// 인자로 siteConfig를 전달받음
function extractRelevantHtml(siteConfig) {
  const NOISE_TAGS = ["script", "style", "noscript", "iframe", "svg", "link[rel=stylesheet]"];
  const config = siteConfig || {
    content: ["main", "article", "#content", "body"],
    remove: [],
  };

  // Stage 1: DOM 클론 + 공통 노이즈 태그 제거
  const clone = document.documentElement.cloneNode(true);
  for (const tag of NOISE_TAGS) {
    clone.querySelectorAll(tag).forEach(el => el.remove());
  }

  // Stage 2: 사이트별 remove 셀렉터 적용
  for (const selector of config.remove) {
    clone.querySelectorAll(selector).forEach(el => el.remove());
  }

  // Stage 3: content 셀렉터 매칭 + 뷰포트 감지
  let selectedHtml = null;
  let alternatives = [];

  for (const selector of config.content) {
    const containers = clone.querySelectorAll(selector);
    if (containers.length === 0) continue;

    if (containers.length === 1) {
      selectedHtml = containers[0].outerHTML;
      break;
    }

    // 2개 이상: 뷰포트 감지로 "현재 보고 있는" 공고 선택
    // 원본 DOM에서 getBoundingClientRect 수행 (클론은 렌더링 안 됨)
    const origContainers = document.querySelectorAll(selector);
    let bestIdx = 0, bestRatio = -1;

    origContainers.forEach((el, i) => {
      const rect = el.getBoundingClientRect();
      const visibleTop = Math.max(0, rect.top);
      const visibleBottom = Math.min(window.innerHeight, rect.bottom);
      const ratio = Math.max(0, visibleBottom - visibleTop) / Math.max(1, rect.height);
      if (ratio > bestRatio) { bestIdx = i; bestRatio = ratio; }
    });

    selectedHtml = containers[bestIdx].outerHTML;

    // alternatives: 다른 공고 목록 (제목 추출)
    containers.forEach((el, i) => {
      if (i !== bestIdx) {
        const title = el.querySelector("h1, h2, h3, [class*=title]")?.textContent?.trim() || `공고 ${i + 1}`;
        alternatives.push({ index: i, title, html: el.outerHTML });
      }
    });
    break;
  }

  // 모든 셀렉터 실패 → generic fallback
  if (!selectedHtml) {
    const fallbacks = ["main", "article", "#content", "body"];
    for (const sel of fallbacks) {
      const el = clone.querySelector(sel);
      if (el && el.innerHTML.trim().length > 0) {
        selectedHtml = el.outerHTML;
        break;
      }
    }
  }

  // Stage 4: 속성 정제 (선택적 — 전송 크기 최적화)
  // 실제 구현 시 불필요한 속성 strip 로직 추가

  return {
    html: selectedHtml || clone.querySelector("body")?.outerHTML || clone.outerHTML,
    alternatives,  // 비어있으면 "다른 공고" UI 미표시
  };
}
```

**핵심 포인트**:
- `cloneNode(true)`: 원본 페이지 DOM을 변경하지 않음 (사용자 경험 보호)
- 4단계 정제: 노이즈 태그 → remove 셀렉터 → content 셀렉터 + 뷰포트 감지 → 속성 정제
- 뷰포트 감지는 원본 DOM에서 수행 (클론은 렌더링되지 않으므로 `getBoundingClientRect` 불가)
- `alternatives` 배열로 "다른 공고" 선택 UI 지원
- fallback 체인: site-specific → generic → body 전체

##### 전송 크기 추정

| 사이트 | 전체 HTML | 추출 후 (예상) | 절감률 |
|--------|-----------|---------------|--------|
| 사람인 공고 | ~2-5MB | ~50-200KB | 90%+ |
| 잡코리아 공고 | ~1-3MB | ~30-150KB | 90%+ |

##### 서버 측 처리 변경

확장 프로그램에서 이미 정제된 HTML을 보내므로, `parse-html` 엔드포인트의 서버 처리가 경량화된다:
- 기존 `OpenAiParsingService.preprocessHtml()`: 전체 HTML에서 셀렉터 기반 추출 + 정제
- 확장 프로그램 경유: 이미 추출된 HTML → `preprocessHtml()`의 정제 로직만 적용 (이중 추출 방지)
- `parseHtml()` 메서드에 `preExtracted: true` 옵션을 두어, content 셀렉터 추출 단계를 스킵하고 제거+마크다운 변환만 수행

#### 4-2. API 호출 (utils/api.js)

- 모든 API 호출은 **popup에서 직접** 수행 (Service Worker 경유하지 않음)
- Service Worker 비활성화에 따른 API 호출 실패 문제 없음
- 토큰 만료 감지 → 401 응답 시 로그인 상태 초기화 + 재로그인 유도
- 기본 헤더: `Authorization: Bearer <token>`, `Content-Type: application/json`

#### 4-3. 토큰 관리 (utils/auth.js)

```javascript
// 저장
async function saveToken(token, expiresAt) {
  await chrome.storage.local.set({
    authToken: token,
    tokenExpiresAt: expiresAt
  });
}

// 조회 + 만료 확인
async function getValidToken() {
  const { authToken, tokenExpiresAt } = await chrome.storage.local.get([...]);
  if (!authToken || new Date(tokenExpiresAt) < new Date()) {
    await chrome.storage.local.remove(["authToken", "tokenExpiresAt"]);
    return null;
  }
  return authToken;
}
```

---

## 3. 기술 스택

> **원칙**: Vanilla JS, Manifest V3, 외부 의존성 0개. 빌드 도구, 번들러, 트랜스파일러 없이 브라우저 네이티브만 사용한다.

| 영역 | 선택 | 이유 |
|------|------|------|
| 언어 | Vanilla JS (ES2020+) | 빌드 도구 불필요, `package.json` 없음, 의존성 0 |
| 확장 매니페스트 | Manifest V3 | Chrome Web Store 필수 요구사항, Chromium 호환 (Chrome, Edge, Brave) |
| 팝업 스타일 | CSS (JobTrack 디자인 토큰 재사용) | 웹과 일관된 룩앤필, CSS 변수로 컬러/폰트 공유 |
| API 통신 | Fetch API (popup에서 직접) | 추가 의존성 불필요, Service Worker 비활성화 영향 없음 |
| 상태 저장 | chrome.storage.local | Manifest V3 권장 방식, 토큰 + 만료일 저장 |
| HTML 추출 | chrome.scripting.executeScript | `activeTab` + `scripting` 권한, 온디맨드 content script 실행 |

---

## 4. 구현 순서 (작업 목록)

### Step 1: 백엔드 — 인증 확장
1. `jwt.ts`에 `signExtensionToken` 함수 추가 (30일 유효)
2. `request.ts`의 `requireAuth`에 Bearer 헤더 인증 추가
3. `POST /api/auth/extension-token` 엔드포인트 작성
4. `/auth/extension-callback` 페이지 작성
5. 기존 로그인 플로우에서 `from=extension` 파라미터 처리 추가

### Step 2: 백엔드 — HTML 파싱 엔드포인트
6. `JobParsingService.parseHtml()` 메서드 추가
7. `POST /api/applications/parse-html` 엔드포인트 작성
8. 요청 크기 제한(5MB) 설정
9. 기존 테스트 보완

### Step 3: 확장 프로그램 — 기본 구조
10. `extension/` 디렉토리 및 `manifest.json` 생성
11. 아이콘 에셋 준비
12. background service worker 기본 구조
13. 팝업 HTML/CSS 기본 레이아웃

### Step 4: 확장 프로그램 — 인증 플로우
14. 팝업 로그인 버튼 → 새 탭 열기
15. auth-callback content_script → 토큰 전달
16. 토큰 저장/조회/만료 관리
17. 로그인/로그아웃 상태 전환

### Step 5: 확장 프로그램 — 저장 플로우
18. 사이트 판별 로직
19. HTML 추출 (executeScript)
20. 파싱 API 호출 + 로딩 상태
21. 편집 폼 UI
22. 저장 API 호출 + 결과 표시

### Step 6: 마무리
23. 에러 핸들링 통합 (네트워크, 401, 파싱 실패 등)
24. 팝업 UI 폴리싱 (JobTrack 디자인 톤 맞춤)
25. Chrome Web Store 등록 준비 (개인정보처리방침, 스크린샷, 설명)

---

## 5. 리스크 및 고려사항

| 리스크 | 영향 | 대응 |
|--------|------|------|
| OpenAI 파싱 지연 (>5초) | UX 저하 | 타임아웃 설정 + "시간이 걸릴 수 있습니다" 안내 |
| content 셀렉터 매칭 실패 | 추출 영역 과대 (body 전체) | generic fallback 적용. 서버 preprocessHtml에서 2차 정제. 5MB 상한 유지 |
| 서버-확장 셀렉터 불일치 | 파싱 품질 저하 | 모노레포 내 동일 저장소 관리 + PR 리뷰 시 동기화 확인. 이후 공통 JSON 추출 검토 |
| Chrome Web Store 심사 거부 | 배포 지연 | 권한 최소화, 개인정보처리방침 사전 준비 |
| 사이트 구조 변경 (셀렉터 깨짐) | 파싱 품질 저하 | LLM 기반 파싱이므로 구조 의존도 낮음. adapter config 양쪽 업데이트로 대응 |
| Service Worker 비활성화 | API 호출 실패 | Manifest V3에서는 이벤트 기반 — 필요 시에만 활성화되므로 문제 없음 |

---

## 6. 테스트 전략

- **백엔드**: 기존 Vitest 테스트에 Bearer 인증 + parse-html 엔드포인트 테스트 추가
- **확장 프로그램**: 개발자 모드 로드 후 수동 E2E 테스트 (사람인/잡코리아 실제 공고 페이지)
- **통합**: 로그인 → 공고 저장 → JobTrack 웹에서 확인 전체 플로우 검증
