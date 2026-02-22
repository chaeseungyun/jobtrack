# JobTrack (My First Fullstack)

JobTrack은 취업 준비생의 지원 파이프라인과 면접/코딩테스트 일정을 한곳에서 관리하기 위한 풀스택 서비스입니다.  
현재는 MVP 기능을 완성했고, V2 단계에서 아키텍처 안정화와 UX 고도화를 진행 중입니다.

## 프로젝트 목표

- 흩어진 지원 정보를 통합 관리
- 단계별 진행 상태를 시각화해 의사결정 지원
- 중요한 일정 누락 방지 (자동 리마인더)

## 주요 기능

- 대시보드: 전체 지원 현황 및 다가오는 일정 요약
- 칸반 보드: 지원 단계별 파이프라인 시각화
- 지원서 관리: 등록/조회/수정
- 일정 관리: 면접/코테/마감 일정 관리
- 문서 관리: PDF 업로드 및 관리
- 인증: JWT + HttpOnly Cookie 기반 자체 인증
- API 문서: Swagger UI (`/swagger`)

## 기술 스택

- Frontend: Next.js 16 (App Router), React 19
- Styling: Tailwind CSS 4, shadcn/ui
- State: TanStack Query
- Backend: Next.js Route Handlers (BFF)
- Database/Storage: Supabase (PostgreSQL, Storage)
- Auth: `jsonwebtoken`, `bcrypt`
- Infra: Vercel, Vercel Cron, Resend, Svix

## 문서 구조

- 제품 요구사항: `docs/prd.md`
  - 문제 정의, 목표, 사용자 시나리오, 성공 지표
- 기술 설계: `docs/architecture.md`
  - 시스템 구조, API 방향, 데이터 흐름, 인증/보안 전략

## 프로젝트 구조

```text
src/
├── app/                # App Router pages + API routes
├── components/         # UI components
│   └── ui/             # shadcn/ui primitives
├── lib/
│   ├── auth/           # JWT/session/auth helpers
│   ├── services/       # domain business logic
│   ├── supabase/       # db client + generated types
│   └── validation/     # zod schemas
└── types/              # shared types
docs/                   # PRD / Architecture docs
public/                 # static files + openapi.json
```

## 진행 현황

- V1 (완료): 핵심 지원서/일정/문서 관리 + 알림 자동화
- V2 (진행 중): 아키텍처 안정화, UX 고도화
  - controller -> service -> repository 방향으로 구조 정리
  - 다크 모드 및 랜딩 페이지 고도화
- V3+ (계획): 자동화 기능 확장(LLM URL 파싱, Gmail 연동 등)

## 시작하기

```bash
pnpm install
pnpm dev
```

주요 스크립트:

```bash
pnpm build
pnpm lint
pnpm db:types
```

## 라이선스

학습 목적의 개인 프로젝트입니다.
