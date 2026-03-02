# LLM 기반 채용 공고 파싱 플로우 (Job Parsing Flow)

본 문서는 사용자가 제공한 URL로부터 채용 공고 데이터를 추출하여 정형화된 데이터로 변환하는 LLM 파이프라인의 상세 설계 및 흐름을 설명합니다.

---

## 1. 개요 (Overview)

채용 사이트마다 각기 다른 HTML 구조와 동적 렌더링(JavaScript) 요구 사항을 가지고 있습니다. JobTrack의 파싱 엔진은 비용 효율성과 데이터 정확성을 모두 잡기 위해 **지능형 라우팅**과 **3단계 전처리 전략**을 사용합니다.

## 2. 시각적 흐름도 (Visual Flow)

```mermaid
graph TD
    A[URL 입력] --> B{캐시 확인}
    B -- 존재 --> C[캐시된 데이터 반환]
    B -- 미존재/장애 --> D[도메인 분석 및 ADAPTER_CONFIG 로드]
    
    D --> E{render_js 여부?}
    E -- true --> F[ScrapingBeeScraper 실행]
    E -- false --> G[NativeScraper 실행]
    
    G -- 성공 --> I[HTML 데이터 확보]
    G -- 404/410 에러 --> X[Error: NOT_FOUND]
    G -- 기타 에러/차단 감지 --> F
    F -- 성공 --> I
    F -- 실패 --> Y[Error: SCRAPE_FAILED]
    
    I --> J{전용 셀렉터 매칭?}
    
    I --> J{전용 셀렉터 매칭?}
    J -- 실패 --> K{Generic 셀렉터 매칭?}
    K -- 실패 --> L[Raw Text 추출]
    J -- 성공 --> M[HTML 클리닝 및 추출]
    K -- 성공 --> M
    
    M --> N[Markdown 변환 및 15,000자 제한]
    L --> N
    
    N --> O[LLM 호출 - gpt-4o-mini]
    O -- 성공 --> P[정형 데이터 반환 - ParsedJob]
    O -- 실패 --> Z{에러 유형 분류}
    Z -- 429 --> Z1[LLM_RATE_LIMIT]
    Z -- 422 --> Z2[LLM_INVALID_JSON/SCHEMA]
    Z -- 502 --> Z3[LLM_UPSTREAM_ERROR/INCOMPLETE]


---

## 3. 주요 컴포넌트 역할

| 컴포넌트 | 역할 |
| :--- | :--- |
| **JobParsingService** | 전체 파이프라인의 오케스트레이터. 캐싱, 도메인 분석, 스크래퍼 선택을 담당. |
| **ADAPTER_CONFIG** | 도메인별 셀렉터, 노이즈 제거 규칙, JS 렌더링 필요 여부를 정의한 중앙 설정. |
| **Scraper Layer** | `NativeScraper`(빠름/무료)와 `ScrapingBeeScraper`(JS 렌더링/우회)로 구성. |
| **OpenAiParsingService** | HTML 전처리(Cleaning), Markdown 변환, LLM 호출 및 스키마 검증 담당. |

---

## 4. 상세 프로세스 (Step-by-Step)

### Step 1: 도메인 분석 및 설정 로드
- `JobParsingService`는 입력된 URL의 호스트네임을 추출합니다.
- `ADAPTER_CONFIG`에서 해당 도메인에 맞는 설정을 찾습니다. (일치하는 설정이 없으면 `generic` 사용)

### Step 2: 지능형 스크래핑 라우팅 (Smart Scraping)
1. **기본 시도**: 설정의 `render_js`가 `false`면 `NativeScraper`를 먼저 사용합니다.
2. **차단 감지 및 견고한 폴백 (Robust Fallback)**:
   - `NativeScraper`는 HTTP 상태 코드에 따라 의미 있는 `AppError`를 발생시킵니다 (404/410 -> `NOT_FOUND`, 5xx -> `UPSTREAM_ERROR`).
   - `JobParsingService`는 다음 조건 발생 시 `ScrapingBeeScraper`로 **최대 1회** 재시도합니다:
     - 404/410을 제외한 모든 에러 발생 시 (네트워크 오류, 5xx 등).
     - HTTP 상태 코드가 `403`, `429`인 경우 (명시적 차단).
     - HTML 본문 길이가 1,000자 미만인 경우 또는 차단 키워드("captcha", "robot" 등)가 포함된 경우.
3. **폴백 제한**: `ScrapingBeeScraper` 최초 시도가 실패하거나, `NativeScraper`가 `NOT_FOUND`를 반환한 경우에는 추가 재시도를 수행하지 않고 즉시 중단하여 불필요한 비용 발생을 방지합니다.

### Step 3: HTML 전처리 및 최적화 (Preprocessing)
`OpenAiParsingService`는 LLM의 토큰 비용을 절감하고 정확도를 높이기 위해 다음 3단계 전략을 수행합니다.

1.  **전용 설정 시도 (Specific)**: `ADAPTER_CONFIG`에 정의된 `content` 셀렉터로 본문만 추출하고, `remove` 셀렉터로 광고/푸터 등 노이즈를 제거합니다.
2.  **공통 설정 시도 (Generic Fallback)**: 1단계 실패 시, `main`, `article` 등 일반적인 본문 태그를 검색합니다.
3.  **순수 텍스트 추출 (Raw Text)**: 모든 셀렉터 매칭 실패 시, HTML 태그를 모두 제거하고 순수 텍스트만 추출합니다.
4.  **최종 가공**: 추출된 HTML을 Markdown으로 변환(Turndown)하고, **최대 15,000자**로 제한하여 LLM에 전달합니다.

### Step 4: LLM 구조화 데이터 추출 및 에러 세분화
- `gpt-4o-mini` 모델을 사용하여 비정형 텍스트에서 `ParsedJob` 스키마를 추출합니다.
- `zodResponseFormat`을 사용하여 일관된 JSON 구조를 보장하며, 실패 시 에러를 세분화합니다:
  - **422 (Unprocessable Entity)**: `LLM_INVALID_JSON`, `LLM_INVALID_SCHEMA` (형식 오류)
  - **429 (Too Many Requests)**: `LLM_RATE_LIMIT` (할당량 초과)
  - **502 (Bad Gateway)**: `LLM_UPSTREAM_ERROR`, `LLM_INCOMPLETE` (모델 응답 불완전 또는 API 서버 오류)

---

## 5. 예외 처리 및 견고성 (Robustness)

- **404/410 명시적 처리**: 공고가 삭제되거나 없는 경우 `NOT_FOUND` 에러를 반환하여 호출 측에서 적절한 UI(예: "공고를 찾을 수 없음")를 보여줄 수 있게 합니다.
- **Best-effort 캐싱 전략**: 캐시 저장(`set`)이나 조회(`get`) 과정에서 발생하는 DB 에러는 치명적이지 않은 것으로 간주합니다. 에러 로깅 후 파이프라인을 계속 진행하여 서비스 가용성을 보장합니다.
- **셀렉터 실패 감지**: 특정 사이트의 DOM 구조가 변경되어 셀렉터가 작동하지 않으면 `console.warn` 로그를 남기되, `generic` 모드로 자동 전환하여 파싱은 중단되지 않게 합니다.
- **로깅 라벨링**: `label` 파라미터(`provided` vs `generic`)를 통해 어떤 단계에서 데이터가 추출되었는지 추적합니다.

---

## 6. 학습 포인트 및 유지보수

- **새 사이트 지원**: `adapter.config.ts`에 도메인과 셀렉터만 추가하면 코드 수정 없이 즉시 대응이 가능합니다.
- **비용 최적화**: HTML을 Markdown으로 변환하여 전달함으로써 raw HTML 대비 토큰 사용량을 최대 70~80% 절감합니다.
