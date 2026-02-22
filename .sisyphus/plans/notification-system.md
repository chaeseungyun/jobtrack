# Plan: Notification System Implementation (Step 7)

## TL;DR
> **Quick Summary**: Resend와 Vercel Cron을 사용하여 D-3/D-1 일정 알림 이메일을 자동 발송하고, Webhook을 통해 발송 상태를 DB에 원자적으로 반영하는 시스템 구축.
> 
> **Deliverables**: 
> - `resend`, `svix` 의존성 및 메일 유틸리티
> - 알림 대상 조회 및 확정 Service logic
> - Vercel Cron API Route (매일 발송 트리거)
> - Resend Webhook API Route (발송 성공 시 DB 업데이트)
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Service 확장 → 메일 유틸 → Webhook 구현 → Cron 연동

---

## Context

### Original Request
지원서의 마감일 및 면접 일정을 D-3, D-1 시점에 이메일로 알림 발송.

### Interview Summary
**Key Discussions**:
- **중복 발송 방지**: Resend Webhook을 사용하여 실제 도달 확인 후 DB 플래그(`notified_d3/d1`) 업데이트.
- **기준 시간**: 모든 시간 연산은 UTC 기준으로 통일.
- **보안**: `svix`로 웹훅 서명 검증, `CRON_SECRET`으로 크론 경로 보호.

### Metis Review
**Identified Gaps** (addressed):
- **멱등성**: 웹훅 재시도 시에도 중복 처리가 되지 않도록 DB 업데이트 로직 설계.
- **데이터 조회**: `events` 조회 시 `applications`와 `users` 테이블을 inner join하여 이메일 주소 확보.

---

## Work Objectives

### Core Objective
신뢰할 수 있는 자동화된 이메일 알림 시스템 구축을 통해 사용자의 일정 누락 방지.

### Concrete Deliverables
- `src/lib/services/application.service.ts`: 알림 관련 메서드 추가.
- `src/lib/email/resend.ts`: Resend 클라이언트 및 발송 유틸.
- `src/app/api/webhooks/resend/route.ts`: 웹훅 핸들러.
- `src/app/api/cron/notifications/route.ts`: 크론 핸들러.

### Definition of Done
- [ ] `pnpm build` 성공
- [ ] Cron 호출 시 대상자 이메일 발송 확인
- [ ] Webhook 수신 시 DB `notified_...` 플래그 `true` 변경 확인

### Must Have
- `svix`를 이용한 웹훅 서명 검증.
- `CRON_SECRET` 헤더 검증.
- UTC 기준 날짜 연산.

### Must NOT Have (Guardrails)
- 사용자의 민감 정보를 로그에 남기지 말 것.
- `Deadline` 외의 이벤트 타입도 알림 대상에 포함(필요 시).

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (`resend`, `svix` installed)
- **Automated tests**: None (Agent-Executed QA focus)

### QA Policy
Every task includes agent-executed QA scenarios using `curl` and `bash`.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation):
├── Task 1: Service Layer 확장 (Notification targets lookup) [quick]
└── Task 2: Email Utility & Resend Client 구성 [quick]

Wave 2 (API Handlers):
├── Task 3: Resend Webhook Handler (Status Confirmation) [unspecified-high]
└── Task 4: Vercel Cron Handler (Notification Dispatcher) [unspecified-high]

Wave 3 (Finalization):
└── Task 5: Integration Testing & Docs Update [quick]

Critical Path: Task 1 → Task 2 → Task 4 → Task 5
```

---

## TODOs

- [ ] 1. Service Layer 확장 (Notification targets lookup)

  **What to do**:
  - `applicationService`에 `findEventsForNotification(supabase, daysBefore)` 메서드 추가.
  - `daysBefore` (1 or 3)를 받아 UTC 기준 해당 날짜의 이벤트를 조회.
  - `events` -> `applications` -> `users` 조인을 통해 `email`, `company_name`, `position`을 포함하여 리턴.
  - `confirmNotification(supabase, eventId, daysBefore)` 메서드 추가 (플래그 업데이트).

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
  - **Skills**: `typescript-programmer`

  **Acceptance Criteria**:
  - [ ] `applicationService.findEventsForNotification` 타입 정의 완결.
  - [ ] SQL 쿼리가 `notified_d1/d3`가 false인 대상만 정확히 추출.

  **QA Scenarios**:
  ```
  Scenario: 조회 메서드 유닛 테스트
    Tool: Bash (node REPL)
    Steps:
      1. applicationService 호출하여 리턴 형상 확인
    Evidence: .sisyphus/evidence/task-1-service-test.txt
  ```

- [ ] 2. Email Utility & Resend Client 구성

  **What to do**:
  - `src/lib/email/resend.ts` 생성.
  - `RESEND_API_KEY` 환경변수 연동.
  - `sendNotificationEmail({ to, subject, data })` 유틸리티 함수 구현.
  - `svix`를 사용한 `verifyResendWebhook(request, body)` 서명 검증 함수 추가.

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Acceptance Criteria**:
  - [ ] Resend 인스턴스 정상 초기화.
  - [ ] Webhook 서명 검증 로직 구현 완료.

- [ ] 3. Resend Webhook Handler

  **What to do**:
  - `src/app/api/webhooks/resend/route.ts` 구현.
  - `delivered` 이벤트 수신 시 `tags`에 포함된 `eventId`와 `type`을 파싱.
  - `applicationService.confirmNotification`을 호출하여 DB 업데이트.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`

  **Acceptance Criteria**:
  - [ ] Svix 서명 검증 통과 시에만 로직 수행.
  - [ ] `notified_...` 플래그 원자적 업데이트 확인.

- [ ] 4. Vercel Cron Handler

  **What to do**:
  - `src/app/api/cron/notifications/route.ts` 구현.
  - `CRON_SECRET` 검증 로직 추가.
  - D-3, D-1 대상자를 각각 조회하여 Resend API로 발송.
  - 발송 시 `tags`에 `eventId`와 `notificationType` 주입.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
- [ ] F2. **Code Quality Review** — `unspecified-high`
- [ ] F3. **Integration QA** — `unspecified-high`

## Commit Strategy
- **1**: `feat(notification): add service logic and email utils`
- **2**: `feat(notification): implement cron and webhook routes`

## Success Criteria
- [ ] Cron 트리거 시 메일 발송 성공 (Resend logs)
- [ ] Webhook 수신 후 DB 플래그 업데이트 확인
- [ ] `pnpm build` 성공
