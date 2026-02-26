# 알림 상태 관리 및 재시도 시스템 고도화 계획

## 1. 문제 상황 (Problem Situation)
- **이진 상태 관리의 한계**: 현재 `events` 테이블의 `notified_d1`, `notified_d3` 컬럼은 Boolean 타입으로, "발송 시도"와 "실제 배달 완료"를 구분하지 못함.
- **신뢰성 부족**: 이메일 발송 중 오류 발생 시 재시도 로직이 없으며, 발송 실패 원인을 파악할 수 있는 로그가 DB에 기록되지 않음.
- **중복 발송 위험**: Cron 서비스와 Webhook이 동일한 컬럼을 업데이트하면서 Race Condition이 발생할 수 있으며, 이로 인해 동일한 알림이 중복 발송될 가능성이 존재함.
- **확장성 부족**: 새로운 종류의 알림(예: D-7, 당일 알림 등)을 추가할 때마다 테이블 스키마를 계속 변경해야 함.

## 2. 해결 방안 (Solution)
- **상태 머신 도입**: `PENDING`, `SENDING`, `SENT`, `DELIVERED`, `FAILED` 상태를 갖는 상태 머신 기반의 관리 체계 도입.
- **전용 테이블 생성**: 알림 전용 테이블(`event_notifications`)을 신설하여 알림의 생명주기를 독립적으로 관리.
- **책임 분리**:
  - **NotificationService (Cron)**: 발송 대상 추출 및 `SENT` 상태까지의 처리 담당.
  - **Webhook**: 실제 수신 여부를 확인하여 `DELIVERED` 상태로 최종 확정.
- **재시도 메커니즘**: 일시적 오류 발생 시 지수 백오프(Exponential Backoff)를 적용한 자동 재시도 로직 구현.

## 3. 근거 (Grounds)
- **멱등성(Idempotency) 보장**: `SENDING` 상태 및 유니크 제약 조건을 통해 중복 발송을 원천 차단.
- **최종 정합성(Eventual Consistency)**: Webhook과의 연동을 통해 시스템 외부(이메일 서버)의 상태와 내부 DB 상태를 일치시킴.
- **가시성(Visibility)**: 실패 사유(`last_error`)와 시도 횟수(`retry_count`)를 기록하여 운영 및 장애 대응 효율화.

## 4. 기대 효과 (Expected Effects)
- 알림 서비스의 안정성 및 신뢰도 향상 (발송 성공률 99.9% 목표).
- 중복 발송으로 인한 사용자 피로도 감소 및 서비스 이미지 제고.
- 장애 발생 시 원인 파악 및 복구 시간(MTTR) 단축.
- 새로운 알림 정책 도입 시 유연한 확장 가능.

## 5. 문제 해결 방법 (Step-by-Step)

### Step 1: 데이터베이스 스키마 정의 및 이관
- `notification_status` Enum 타입 생성.
- `event_notifications` 테이블 생성 (Unique: `event_id`, `type`).
- 기존 `notified_d1/d3` 데이터를 새 테이블로 이관하는 마이그레이션 스크립트 작성.

### Step 2: Repository 레이어 고도화
- `IEventRepository`에서 알림 관련 로직을 분리하거나, 새로운 `INotificationRepository` 정의.
- 원자적 상태 변경(Atomic Update)을 위한 메서드 구현 (예: `claimForSending`).

### Step 3: NotificationService 리팩토링
- 발송 로직에 상태 전환 로직 추가.
- 에러 핸들링 로직 구현 (일시적 오류 vs 영구적 오류 구분).
- 재시도 스케줄링 로직 추가 (`next_retry_at` 계산).

### Step 4: Webhook 핸들러 업데이트
- `resend/route.ts`에서 웹훅 수신 시 `event_notifications` 테이블의 상태를 `DELIVERED`로 업데이트하도록 변경.
- Bounce 등 실패 웹훅에 대한 처리 로직 추가 (`FAILED` 전환).

### Step 5: 검증 및 모니터링
- 로컬 테스트 및 스테이징 환경에서의 재시도 시나리오 검증.
- `pnpm build` 및 린트 체크.
- 실패 알림에 대한 슬랙 알림 등 모니터링 연결(선택 사항).
