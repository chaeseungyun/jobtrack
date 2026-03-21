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

- [ ] `jwt.ts`에 `signExtensionToken(claims: AuthClaims): string` 함수 추가
  - 30일 유효 (`30d`)
  - 기존 `signAuthToken` (7일)과 분리
- [ ] `request.ts`에 `extractToken(request: NextRequest)` 헬퍼 추가
  - Cookie 우선 확인 → 없으면 `Authorization: Bearer` 헤더에서 추출
- [ ] `requireAuth` 함수가 `extractToken`을 사용하도록 수정
- [ ] 기존 테스트 통과 확인

### 완료 조건

- [ ] `pnpm build` 성공
- [ ] `pnpm test:run` — 기존 테스트 통과
- [ ] 기존 웹 Cookie 인증 플로우 영향 없음 확인

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

- [ ] `POST /api/auth/extension-token` 엔드포인트 생성
  - 파일: `src/app/api/auth/extension-token/route.ts`
  - Cookie 기반 인증 필요 (로그인 상태에서만 호출)
  - 응답: `{ token: string, expiresAt: string }` (30일 JWT)
- [ ] `/auth/extension-callback` 페이지 생성
  - 파일: `src/app/auth/extension-callback/page.tsx` (클라이언트 컴포넌트)
  - 마운트 시 `fetch('/api/auth/extension-token')` 호출하여 토큰 발급 (세션 쿠키 자동 첨부)
  - 응답받은 토큰을 `data-extension-token` 속성으로 DOM에 삽입
  - 확장 프로그램의 content_script(MutationObserver)가 토큰을 읽어가는 브릿지 역할
  - **"로그인 완료! 확장 프로그램 아이콘을 다시 클릭해주세요"** 안내 문구 표시 (팝업은 새 탭이 열리면서 자동 닫힘)
- [ ] 기존 로그인 플로우에 `from=extension` 파라미터 처리 추가
  - 로그인 성공 시 `from=extension`이면 `/auth/extension-callback`으로 리다이렉트

### 완료 조건

- [ ] `pnpm build` 성공
- [ ] 기존 로그인 플로우 영향 없음 확인 (`from` 파라미터 없을 때 기존 동작)
- [ ] `/api/auth/extension-token` 수동 호출 시 JWT 응답 확인
- [ ] `/auth/extension-callback` 페이지 렌더링 확인

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

- [ ] `JobParsingService`에 `parseHtml(url: string, html: string)` 메서드 추가
  - 스크래핑 단계 건너뛰고 HTML 정제 → LLM 파싱만 수행
  - `preExtracted: true` 옵션으로 content 셀렉터 추출 단계 스킵
  - 캐시 저장은 기존과 동일 적용
- [ ] `POST /api/applications/parse-html` 라우트 생성
  - 파일: `src/app/api/applications/parse-html/route.ts`
  - 인증: `requireAuth` (Cookie 또는 Bearer)
  - 요청 본문: `{ url: string, html: string }`
  - Zod 스키마 추가 (`src/lib/validation/`)
  - 요청 크기 제한: 5MB
- [ ] 기존 URL 파싱 엔드포인트(`POST /api/applications/parse`)는 변경 없이 유지

### 완료 조건

- [ ] `pnpm build` 성공
- [ ] `pnpm test:run` — 기존 테스트 통과
- [ ] 기존 URL 파싱 플로우 영향 없음 확인

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

- [ ] `POST /api/auth/extension-token` 스펙 추가
  - 요청: 없음 (Cookie 인증)
  - 응답: `{ token: string, expiresAt: string }`
- [ ] `POST /api/applications/parse-html` 스펙 추가
  - 요청: `{ url: string, html: string }`
  - 응답: 기존 `parse` 엔드포인트와 동일한 형식
  - 인증: Bearer 토큰

### 완료 조건

- [ ] `/swagger` 페이지에서 새 엔드포인트 2개 확인
- [ ] `pnpm build` 성공

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

- [ ] `extension/` 디렉토리 구조 생성
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
  │   ├── api.js
  │   ├── auth.js
  │   └── sites.js            (빈 파일 — Step 6에서 구현)
  └── icons/
      ├── icon-16.png
      ├── icon-48.png
      └── icon-128.png
  ```
- [ ] `manifest.json` 작성
  - permissions: `activeTab`, `storage`, `scripting`
  - host_permissions: 사람인, 잡코리아, JobTrack 도메인
  - content_scripts: 인증 콜백 페이지에만 `auth-callback.js`
- [ ] `auth-callback.js` 구현
  - `MutationObserver`로 `data-extension-token` 속성이 DOM에 삽입될 때까지 대기 (content_script는 클라이언트 컴포넌트 fetch 완료보다 먼저 실행되므로 필수)
  - 속성 감지 시 토큰과 만료일을 읽어 `chrome.storage.local`에 직접 저장 (Service Worker 불필요)
- [ ] `auth.js` 구현
  - `saveToken(token, expiresAt)`, `getValidToken()`, `clearToken()`
- [ ] `api.js` 기본 구조
  - `apiCall(endpoint, options)` — Bearer 토큰 자동 첨부, 401 처리
- [ ] `popup.html/css/js` — 로그인 화면 구현
  - 초기화 시 `chrome.storage.local`에서 토큰 확인 → 없거나 만료면 "JobTrack 로그인" 버튼 표시
  - 로그인 클릭 → 새 탭으로 `/auth?from=extension` 열기 (팝업은 자동 닫힘)
  - 사용자가 웹 로그인 완료 후 아이콘 재클릭 → 초기화에서 토큰 확인 → 메인 UI 표시
- [ ] 아이콘 생성 (심플 플레이스홀더)

### 완료 조건

- [ ] `chrome://extensions` 개발자 모드에서 로드 성공 (에러 없음)
- [ ] 팝업 열기 → 로그인 버튼 표시 확인
- [ ] 로그인 버튼 클릭 → JobTrack 로그인 페이지 새 탭 열림
- [ ] 로그인 완료 → 콜백 페이지 → 토큰 수신 → 팝업 메인 UI 전환 수동 확인

---

## Step 6: 확장 프로그램 — HTML 추출 + 저장 플로우

**선행**: Step 3, Step 5

### 컨텍스트 복구

| 읽을 파일 | 이유 |
|-----------|------|
| `docs/extension/step.md` | 전체 작업 흐름 복구 |
| `docs/extension/implementation-plan.md` § 4-1 | HTML 추출 전략 (4단계 정제, 뷰포트 감지) |
| `docs/extension/flow.md` § 3, 4 | HTML 추출 + 다른 공고 선택 플로우 |
| `src/lib/core/config/adapter.config.ts` | 서버 adapter config (동기화 기준) |
| `extension/utils/api.js` | Step 5에서 만든 API 래퍼 |
| `extension/popup/popup.js` | Step 5에서 만든 팝업 로직 |

### 작업

- [ ] `sites.js` 구현
  - `SITE_CONFIGS` — `adapter.config.ts`와 동기화
  - `matchSite(url)` — URL → 사이트 config 매칭
  - `isSupportedSite(url)` — 지원 사이트 여부
- [ ] `extractor.js` 구현 — 4단계 정제 파이프라인
  - Stage 1: 노이즈 태그 제거 (script, style, noscript, iframe, svg)
  - Stage 2: remove 셀렉터 적용 (사이트별)
  - Stage 3: content 셀렉터 매칭 + 뷰포트 감지
    - 컨테이너 0개 → generic fallback
    - 컨테이너 1개 → 바로 추출
    - 컨테이너 2개+ → `getBoundingClientRect` 기반 뷰포트 비율 계산
    - `alternatives` 배열 반환 (다른 공고 선택용)
  - Stage 4: 속성 정제 (불필요 속성 strip)
- [ ] `popup.js` 저장 플로우 추가
  - 사이트 판별 → "이 공고 저장하기" / "미지원 사이트" 분기
  - 저장 클릭 → `chrome.scripting.executeScript`로 extractor 실행
  - 추출된 HTML → `POST /api/applications/parse-html` 호출
  - 파싱 결과 → 확인 화면 ("이 공고가 맞나요?")
  - "다른 공고" 클릭 시 → alternatives 목록 표시 → 선택 후 재파싱
  - 편집 폼 → 수정 → `POST /api/applications` → 성공/실패 처리
- [ ] `api.js`에 `parseHtml(url, html)`, `createApplication(data)` 추가

### 완료 조건

- [ ] 사람인 공고 페이지에서 저장 플로우 수동 테스트 성공
- [ ] 잡코리아 공고 페이지에서 저장 플로우 수동 테스트 성공
- [ ] 미지원 사이트에서 안내 메시지 표시 확인
- [ ] JobTrack 웹에서 저장된 지원서 확인

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
