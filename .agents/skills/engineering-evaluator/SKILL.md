---
name: engineering-evaluator
description: Structured code and architecture scoring framework. Use when evaluating, reviewing, or rating code quality and system architecture.
license: UNLICENSED
metadata:
  author: chaeseungyun
  version: "1.0.0"
---

# Skill: Engineering Evaluator
...


# Skill: Engineering Evaluator

## Purpose
코드 및 아키텍처를 정량/정성 기준에 따라 평가하고,
객관적인 점수와 개선 방향을 제시한다.

이 skill은 감상이나 취향이 아닌,
명확한 평가 지표 기반으로 분석하도록 강제한다.

---

## When To Use
- 코드 리뷰 요청
- 아키텍처 구조 평가 요청
- 리팩토링 우선순위 결정
- 기술 부채 분석
- 면접 대비 평가 연습

---

## Evaluation Framework

### 1. Code Quality (각 항목 1~5점)

#### 1.1 Readability
- 변수/함수명이 의도를 명확히 드러내는가?
- 함수 길이 과도하지 않은가?
- 중첩 조건이 3단계를 넘는가?

#### 1.2 Cohesion
- 한 모듈이 하나의 책임만 가지는가?
- UI/비즈니스 로직이 분리되어 있는가?

#### 1.3 Coupling
- 외부 의존성이 최소화되어 있는가?
- 인터페이스 기반 설계인가?

#### 1.4 Testability
- 순수 함수 구조인가?
- mock 가능한가?

#### 1.5 Anti-Patterns
- God Component
- Massive useEffect
- Deep Prop Drilling
- N+1 요청
- 불필요한 상태

---

### 2. Architecture Quality (각 항목 1~5점)

#### 2.1 Scalability
- 수평 확장 가능 구조인가?
- Stateless 유지 가능한가?
- 병렬 처리 구조인가?

#### 2.2 Modifiability
- 기능 추가 시 수정 범위가 좁은가?
- 레이어 분리가 되어 있는가?

#### 2.3 Separation of Concerns
- Presentation / Domain / Data / Infra 분리 여부

#### 2.4 Performance Structure
- waterfall 구조인가?
- 캐싱 전략 존재하는가?
- 클라이언트/서버 역할이 적절히 분리되었는가?

#### 2.5 Resilience
- 실패 대비 fallback 존재하는가?
- timeout/retry 정책 고려했는가?

---

## Scoring Rules

- 각 항목 1~5점
- 1점 = 심각한 구조 문제
- 3점 = 보통 수준 (개선 필요)
- 5점 = 우수

### 총점 계산
- Code Quality 총점 (25점 만점)
- Architecture Quality 총점 (25점 만점)
- Overall Score (50점 만점)

---

## Output Format (Strict)

반드시 아래 형식으로 출력한다:

### 📊 Code Quality
- Readability: X/5
- Cohesion: X/5
- Coupling: X/5
- Testability: X/5
- Anti-Patterns: X/5
Subtotal: XX/25

### 🏗 Architecture Quality
- Scalability: X/5
- Modifiability: X/5
- Separation: X/5
- Performance Structure: X/5
- Resilience: X/5
Subtotal: XX/25

### 🧮 Overall Score
XX / 50

### 🔥 Critical Issues (Top 3)
1.
2.
3.

### 🚀 Improvement Priority
1.
2.
3.

---

## Evaluation Mode Rules

- 감정적 표현 금지
- 구체적 근거 기반으로 점수 부여
- 개선 방향은 실행 가능한 수준으로 제시
- 불확실한 부분은 추측하지 말고 "정보 부족"으로 명시
