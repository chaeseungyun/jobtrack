# Job Parsing Error Handling 고도화 (Technical Note)

> **문서 역할**: 특정 기술적 문제 해결 과정, 복잡한 로직의 상세 설계, 성능 최적화 경험 등을 깊이 있게 기록합니다.
> **작성 대상**:
>
> - 코드만으로는 파악하기 힘든 비즈니스 맥락이나 기술적 트레이드오프가 포함된 작업
> - 향후 이력서나 기술 블로그의 소재로 활용 가능한 고난도 작업
> - 대규모 리팩토링이나 새로운 기술 스택 도입 사례
>   **작성 가이드**: 문제 정의 -> 원인 분석 -> 해결 방안(선택지와 근거) -> 구현 상세 -> 결과 및 성과 순으로 작성합니다.

---

## 1. 개요

기존 `JobParsingService`의 스크래핑 및 파싱 로직에서 발견된 비효율성을 제거하고, 에러 핸들링을 세분화하여 시스템의 안정성과 비용 효율성을 높인 작업입니다.

## 2. 문제 정의 (Problem Statement)

### 2.1. 스크래핑 폴백(Fallback) 로직의 비효율성

- **불필요한 호출**: 404, 410과 같이 재시도가 의미 없는 상태 코드에서도 ScrapingBee(유료) 폴백이 실행됨.
- **중복 실행**: ScrapingBee 최초 실행 실패 후 폴백 로직에 의해 한 번 더 실행되는 구조적 결함.
- **네트워크 오류**: DNS 실패 등 인프라 수준의 오류를 서비스 레이어가 직접 판단하여 책임이 과도하게 집중됨.

### 2.2. 캐시 장애의 전파

- 캐시 서버(Supabase) 조회/저장 실패 시 전체 파싱 요청이 실패함. 캐시는 보조적인 수단임에도 비즈니스 핵심 로직과 동일한 치명도를 가짐.

### 2.3. 파서(Parser) 단계의 에러 미분리

- OpenAI API 오류, JSON 파싱 실패, Zod 스키마 불일치 등이 모두 500 에러로 뭉뚱그려져 반환되어 정확한 원인 파악이 어려움.

## 3. 해결 방안 (Solution)

### 3.1. 스크래퍼 레이어 책임 강화 및 상태 코드 매핑

- 각 스크래퍼(`Native`, `ScrapingBee`) 내부에서 HTTP 상태 코드를 분석하여 의미 있는 도메인 에러(`AppError`)로 변환.
- 404/410 -> `NOT_FOUND` (즉시 중단)
- 5xx -> `UPSTREAM_ERROR` (폴백 대상)
- 네트워크 오류 -> `NOT_FOUND` 또는 `SCRAPE_FAILED`

### 3.2. 폴백 정책 최적화

- `NOT_FOUND`는 절대 재시도하지 않음.
- ScrapingBee는 어떤 경로로든 **최대 1회**만 호출되도록 보장.

### 3.3. LLM 파서 에러 세분화

- `finish_reason` 미준수: `LLM_INCOMPLETE` (502)
- OpenAI Rate Limit: `LLM_RATE_LIMIT` (429)
- JSON/Schema 오류: `LLM_INVALID_JSON`, `LLM_INVALID_SCHEMA` (422)

### 3.4. Best-effort 캐시 전략

- 캐시 관련 작업(`get`, `set`)을 `try-catch`로 감싸고, 실패 시 로깅만 수행 후 본 로직을 계속 진행하도록 변경.

## 4. 구현 상세 (Implementation)

### JobParsingService.ts (폴백 로직)

```typescript
try {
  const nativeResult = await this.nativeScraper.scrape(url);
  if (this.shouldRetryWithSpb(nativeResult)) {
    return await this.spbScraper.scrape(url);
  }
  return nativeResult;
} catch (error) {
  if (isNotFoundError(error)) throw error; // 404는 즉시 반환
  return await this.spbScraper.scrape(url); // 그 외 에러만 폴백
}
```

## 5. 결과 및 성과 (Results)

- **비용 절감**: 404 에러에 대한 유료 스크래퍼 호출 차단.
- **안정성 향상**: 캐시 서버 장애 시에도 서비스 정상 운영 가능 (탄력적 설계).
- **모니터링 강화**: 에러 코드 세분화를 통해 운영 이슈 대응 속도 향상.
- **테스트 커버리지**: 비정상 응답 및 폴백 시나리오에 대한 단위 테스트 100% 통과.

## Error Taxonomy

### 1. Scraper Layer

| Error Code              | HTTP Status | 설명                                 | 발생 위치                         |
| ----------------------- | ----------- | ------------------------------------ | --------------------------------- |
| `NOT_FOUND`             | 404         | 공고가 존재하지 않음 (404, 410)      | NativeScraper, ScrapingBeeScraper |
| `UPSTREAM_ERROR`        | 502         | 원본 서버 5xx 응답                   | NativeScraper, ScrapingBeeScraper |
| `SCRAPINGBEE_API_ERROR` | 502         | ScrapingBee API 자체 오류            | ScrapingBeeScraper                |
| `SCRAPE_FAILED`         | 4xx         | 스크래핑 실패 (기타 클라이언트 오류) | NativeScraper, ScrapingBeeScraper |

### 2. LLM Parser Layer

| Error Code           | HTTP Status | 설명                        | 발생 위치            |
| -------------------- | ----------- | --------------------------- | -------------------- |
| `LLM_RATE_LIMIT`     | 429         | OpenAI API Rate Limit 초과  | OpenAiParsingService |
| `LLM_UPSTREAM_ERROR` | 502         | OpenAI 5xx 응답             | OpenAiParsingService |
| `LLM_API_ERROR`      | 502         | 기타 OpenAI API 오류        | OpenAiParsingService |
| `LLM_INCOMPLETE`     | 502         | finish_reason이 stop이 아님 | OpenAiParsingService |
| `LLM_EMPTY_RESPONSE` | 502         | choices가 비어 있음         | OpenAiParsingService |
| `LLM_EMPTY_CONTENT`  | 502         | message.content가 비어 있음 | OpenAiParsingService |
| `LLM_INVALID_JSON`   | 422         | JSON.parse 실패             | OpenAiParsingService |
| `LLM_INVALID_SCHEMA` | 422         | Zod 스키마 검증 실패        | OpenAiParsingService |

### 3. Cache Layer (Best-Effort)

| Error Code           | HTTP Status | 설명           | 처리 방식    |
| -------------------- | ----------- | -------------- | ------------ |
| `CACHE_READ_FAILED`  | -           | 캐시 조회 실패 | 로그 후 무시 |
| `CACHE_WRITE_FAILED` | -           | 캐시 저장 실패 | 로그 후 무시 |

### 4. Controller Layer (HTTP Mapping)

| AppError Code           | HTTP Status |
| ----------------------- | ----------- |
| `NOT_FOUND`             | 404         |
| `LLM_RATE_LIMIT`        | 429         |
| `LLM_INVALID_JSON`      | 422         |
| `LLM_INVALID_SCHEMA`    | 422         |
| `UPSTREAM_ERROR`        | 502         |
| `SCRAPINGBEE_API_ERROR` | 502         |
| `LLM_UPSTREAM_ERROR`    | 502         |
| 기타                    | 500         |
