# JobTrack 크롬 확장 프로그램 — 배포·관측·운영 전략

> **문서 역할**: MVP 배포 이후의 릴리스 관리, 관측, 장애 대응, 품질 유지 전략을 정의한다.
> **상태**: 초안 (MVP 미배포)
> **관련 문서**: `requirements.md`, `implementation-plan.md`

이 문서는 Step 7 이후 또는 이와 병행하여 구현할 운영 인프라의 설계 초안이다. 항목별로 "MVP 필수 / 1차 배포 후 / 향후"로 우선순위를 구분한다.

---

## 1. 배포 전략

### 1.1 버전 관리

- **SemVer** (`manifest.json` `version`)
  - `MAJOR.MINOR.PATCH`
  - MAJOR: 사용자 재인증 필요, 데이터 모델 breaking change
  - MINOR: 새로운 사이트 지원, 신규 기능
  - PATCH: 버그 수정, 셀렉터 업데이트
- 릴리스 태그는 `ext-v1.0.0` 형식 (서버 릴리스와 구분)

### 1.2 환경 기본값

`implementation-plan.md` §3의 "빌드 도구 없음" 원칙을 유지한다. 빌드 파이프라인 도입 없이 다음 규율로 운용:

- `extension/utils/config.js`의 `DEFAULT_WEB_ENV` 기본값은 **`"production"`으로 커밋**. 휴먼 에러 방향을 "배포 전 prod로 바꾸는 걸 잊음" → "로컬에서 dev로 바꾸는 걸 잊음"으로 뒤집음 (후자는 즉시 알아챔)
- 로컬 테스트 시에만 `"development"`로 일시 변경 (커밋 금지). `git diff` 또는 pre-commit 훅으로 실수 방지
- `manifest.json`의 `http://localhost:3000/*` host_permissions 및 content_scripts match는 Web Store 심사 기준 확인 후 결정:
  - 심사에 문제없으면 그대로 유지 (개발자 편의)
  - 거슬리면 제출 시 해당 라인만 수동 제거 후 zip

**패키징** (향후 필요 시):
- 단순 zip만으로 충분. 빌드 도구가 아니라 명령 수준 — `zip -r extension-v{VERSION}.zip extension/`
- MVP 단계에서는 수동 zip. 릴리스 빈도가 올라가면 `scripts/pack-extension.sh` 추가

**우선순위**: 즉시 (기본값 전환만, 1줄 변경).

### 1.3 Chrome Web Store 릴리스

- **정기 배포 채널**: Production (일반 사용자)
- **테스트 채널**: Trusted Testers 그룹 (내부/지인)
- 배포 체크리스트:
  - [ ] `pnpm ext:build:prod` 성공
  - [ ] `manifest.json` version bump
  - [ ] CHANGELOG.md 업데이트 (확장 전용 섹션)
  - [ ] 스크린샷 4장 (사람인 저장, 잡코리아 저장, 로그인, 성공 화면)
  - [ ] 개인정보처리방침 페이지 URL 유효
  - [ ] Trusted Testers에 먼저 업로드 → 24시간 문제 없으면 Production 승격
- **롤백 전략**: Chrome Web Store는 이전 버전 복원 불가 → 긴급 수정 시 hotfix 버전 재업로드 (심사 대기 수 시간~며칠 감수). 따라서 **배포 전 staging 검증이 유일한 안전망**.

### 1.4 서버 ↔ 확장 호환성

- 확장은 구버전이 상당 기간 필드에 남아있으므로, 서버 API는 **확장이 보내는 페이로드에 대해 하위 호환**을 유지해야 함
- Breaking change 발생 시:
  - 서버는 구 필드를 N주(예: 4주) 유지
  - 확장은 MAJOR bump로 신 필드 강제 사용
  - `/api/applications` 등에서 버전 헤더(`X-Extension-Version`) 전송 → 서버가 취약 버전 감지 시 재로그인/업데이트 유도 응답 반환

---

## 2. 관측 전략

### 2.1 추적해야 할 지표

| 범주 | 지표 | 목적 | 우선순위 |
|------|------|------|----------|
| 사용 | DAU/WAU, 확장 활성 설치 수 | 성장 추적 | 1차 배포 후 |
| 사용 | 저장 시도 수, 성공 수 | 핵심 가치 전달 확인 | MVP 필수 |
| 품질 | 파싱 실패율 (사이트별) | 셀렉터 노후화 감지 | MVP 필수 |
| 품질 | 파싱 소요 시간 p50/p95 (NFR-5 검증) | OpenAI 지연 모니터링 | MVP 필수 |
| 품질 | content 셀렉터 매칭 실패율 | generic fallback 의존도 | MVP 필수 |
| 품질 | `alternatives` 사용률 | Step 6-4 ROI 검증 | 1차 배포 후 |
| 비용 | OpenAI 토큰 소비 (요청별) | 단가 추적 | MVP 필수 |
| 인증 | 토큰 발급/만료 빈도 | 재로그인 UX 부담 측정 | 1차 배포 후 |
| 에러 | 401/403/5xx 응답 비율 | 서버 안정성 | MVP 필수 |

### 2.2 수집 경로

**서버 사이드 (MVP 필수, 기존 인프라 활용)**
- `POST /api/applications/parse-html` 라우트에서 구조화 로그 출력 (host, 파싱 성공/실패, 소요 ms, 토큰 수, 확장 버전)
- Vercel Analytics + Logs로 1차 집계. 집계 한계 도달 시 외부 APM(Sentry/Datadog) 도입 검토
- `X-Extension-Version`, `X-Extension-Site`(saramin|jobkorea) 요청 헤더 규약 추가

**클라이언트 사이드 (1차 배포 후)**
- 현재: `console.error`만. DevTools 열린 사용자만 관측 가능
- 제안: 경량 클라이언트 텔레메트리 엔드포인트 `POST /api/telemetry/extension`
  - 확장 에러(네트워크 실패, extractor 실패 등)를 **익명 집계**로 수집
  - 개인정보 미포함(URL/HTML 전송 금지), 익명 디바이스 ID 해시만
  - opt-out 스위치를 팝업 설정에 제공 (NFR-9 개인정보처리방침 요구사항)
- 외부 SaaS(Sentry)를 쓰면 빠르지만 번들 크기와 CSP 고려 필요

### 2.3 알림 (1차 배포 후)

- 파싱 실패율이 사이트별 **24시간 평균 > 20%**이면 Slack/이메일 알림 (→ 셀렉터 변경 의심)
- OpenAI 파싱 p95 > 10초 이면 알림 (NFR-5 위반)
- 토큰 발급 엔드포인트 에러율 > 5% 이면 알림

---

## 3. 운영 플레이북

### 3.1 사이트 셀렉터가 깨졌을 때

**감지**:
- 관측 대시보드에서 특정 사이트 파싱 실패율 급증
- 사용자 제보 (GitHub Issue 또는 이메일)

**대응**:
1. 실제 공고 페이지에서 DevTools로 현재 셀렉터 유효성 확인
2. `src/lib/core/config/adapter.config.ts` + `extension/utils/sites.js` 동시 업데이트
3. 확장 MINOR bump → `pnpm ext:build:prod` → Web Store 제출
4. 서버는 즉시 반영되므로 신규 구조에 대해 일부 유저는 구 확장에서도 동작 가능

**예방**:
- CI에서 **셀렉터 키 동기화 검증** 스크립트 실행 (자세한 내용은 §4)
- 분기별 1회 사이트 변경 스모크 체크 (수동 또는 Playwright)

### 3.2 OpenAI 파싱이 대규모 실패할 때

**감지**: 파싱 실패율 전 사이트 공통 급증 + OpenAI 대시보드 상태 확인

**대응**:
1. 단기: 팝업에 "AI 분석 일시 장애 — 잠시 후 다시 시도해주세요" 안내 (서버에서 플래그 응답)
2. 중기: 재시도 백오프 전략 (확장 측) + 대체 모델 폴백 (서버 측) 검토
3. 장기: 다른 LLM 공급자 이중화

### 3.3 토큰 유출 의심 상황

**감지**: 특정 유저의 API 호출이 비정상적으로 많거나, 여러 IP에서 동일 토큰 사용

**대응**:
1. `user_id`별 토큰 강제 무효화 엔드포인트 활용 (미구현 시 Step 7 범위로 포함)
2. 해당 유저에게 이메일 통지 → 재로그인 유도
3. 전수 강제 무효화가 필요한 경우 JWT 서명 키 로테이션 (기존 토큰 전체 무효)

### 3.4 Chrome Web Store 심사 거부 시

- 거부 사유를 반영하여 manifest/설명/개인정보처리방침 수정 후 재제출
- 대안 배포 경로는 없음(Edge Add-ons는 심사 별도). **심사 거부는 사용자 신규 설치 차단 = 치명적** → 심사 가이드 사전 준수가 최선

---

## 4. 품질 유지 자동화

### 4.1 셀렉터 동기화 CI (MVP 필수)

서버 adapter config와 확장 sites.js의 **키 집합 일치**를 CI에서 검증.

**스크립트 초안** (`scripts/check-extension-sync.mjs`):
- `src/lib/core/config/adapter.config.ts`에서 사이트 도메인/셀렉터 키 파싱
- `extension/utils/sites.js`에서 동일 정보 파싱
- 두 집합이 완전히 일치하지 않으면 exit 1
- GitHub Actions의 PR 워크플로우에 추가 (`pnpm check:ext-sync`)

향후: 단일 source of truth(JSON)로 추출하여 양쪽이 import하도록 변경 — 근본 해결.

### 4.2 E2E 스모크 (1차 배포 후)

- Playwright + Chromium에 확장 로드
- 사람인/잡코리아 공고 페이지 각 1건 저장 → 성공 화면 도달 확인
- 주 1회 GitHub Actions cron으로 실행 (또는 릴리스 전 수동 실행)
- 실제 OpenAI 호출 비용 고려해 dev 서버의 응답 mock 가능

### 4.3 수동 검증 체크리스트 (릴리스 전)

`docs/extension/step.md` Step 7의 완료 조건과 중복 최소화하여 **릴리스별 재사용 체크리스트**로 분리 유지.

```
[ ] 로그인 → 콜백 → 팝업 재진입 (새로고침 없이)
[ ] 사람인 공고 저장 E2E
[ ] 잡코리아 공고 저장 E2E
[ ] 미지원 사이트에서 적절한 안내 표시
[ ] 토큰 만료 상태에서 재로그인 유도
[ ] 오프라인 상태에서 적절한 에러 표시
```

---

## 5. 우선순위 요약

| 단계 | 항목 | 비고 |
|------|------|------|
| **즉시** | `DEFAULT_WEB_ENV` 기본값을 `"production"`으로 전환 (§1.2) | 빌드 없이 휴먼 에러 방향 뒤집기 |
| **Step 7 범위** | 서버 로그 필드 정비 + 확장 버전 헤더 (§2.2) | 관측 최소 기반 |
| **Step 7 범위** | 셀렉터 동기화 CI (§4.1) | 쉬운 비용 대비 큰 방어력 |
| **1차 배포 직후** | 파싱 실패율/지연 대시보드 + 알림 (§2.3) | 지표 먼저 보고 개선 |
| **1차 배포 직후** | 클라이언트 텔레메트리 엔드포인트 (§2.2) | opt-out + 개인정보 준수 |
| **향후** | adapter config ↔ sites.js 단일 JSON 추출 | 근본 해결 |
| **향후** | E2E Playwright 스모크 (§4.2) | 회귀 방어 |
| **향후** | OpenAI 이중화 / 대체 모델 (§3.2) | 공급자 리스크 대응 |

---

## 6. 미결 사항

- 클라이언트 텔레메트리의 개인정보 범위 확정 (URL 일부 해시? 사이트 enum만?)
- 서버 로그 보존 기간 정책
- Chrome Web Store 외 다른 브라우저(Edge/Brave) 동시 배포 여부
- 확장 자체 업데이트 외에, 확장 사용자에게 "신규 지원 사이트 추가" 같은 배포 내역을 어떻게 전달할지 (in-popup 뱃지? 릴리스 노트 링크?)
