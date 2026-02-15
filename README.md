# JobTrack (My First Fullstack)

JobTrack은 취준생을 위한 지원서 관리 및 일정 추적 대시보드입니다. 여러 채용 사이트에 흩어진 지원 정보를 한곳에서 관리하고, 중요한 일정을 놓치지 않도록 돕는 것을 목적으로 합니다.

이 프로젝트는 서버부터 프론트엔드까지 풀스택 개발 및 배포 과정을 학습하기 위한 학습용 프로젝트입니다.

## 🚀 주요 기능

- **대시보드**: 전체 지원 현황 지표 및 다가오는 일정(D-Day) 요약
- **칸반 보드**: 지원 단계별(관심, 지원완료, 서류합격, 과제, 면접, 최종합격, 불합격) 파이프라인 시각화
- **지원서 관리**: 지원서 등록, 수정, 상세 조회 및 메모 관리
- **일정 관리**: 서류 마감, 결과 발표, 면접 일정 등록 및 리마인드
- **문서 관리**: 이력서, 포트폴리오 등 관련 문서 업로드 (PDF 지원 예정)
- **인증 시스템**: JWT 기반의 자체 회원가입 및 로그인
- **API 문서**: Swagger(`/swagger`)를 통한 인터랙티브 API 문서 제공

## 🛠 기술 스택

- **Frontend**: Next.js 16 (App Router), React 19
- **Styling**: Tailwind CSS 4, shadcn/ui
- **Backend**: Next.js API Routes (Route Handlers)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Auth**: JWT (jsonwebtoken) + bcrypt
- **API Spec**: Swagger (OpenAPI 3.0)
- **Deployment**: Vercel (Scheduled via Vercel Cron)

## 📁 프로젝트 구조

```text
src/
├── app/              # Next.js App Router (Pages & API Routes)
├── components/       # 공통 UI 및 도메인 컴포넌트
│   └── ui/           # shadcn/ui 기반 원자 컴포넌트
├── lib/              # 유틸리티 및 클라이언트 설정 (Supabase, Auth 등)
├── types/            # TypeScript 공용 타입 정의
docs/                 # 프로젝트 요구사항 및 개발 로드맵
public/               # 정적 자산 및 OpenAPI 스펙 (openapi.json)
supabase/             # DB 마이그레이션 및 설정
```

## 📈 진행 상황 (MVP 개발 중)

- [x] Step 1. 프로젝트 기반 세팅 (Next.js, shadcn/ui)
- [x] Step 2. Supabase 연동 베이스 코드 구현
- [x] Step 3. 인증(Auth) 시스템 구현 (회원가입/로그인)
- [x] Step 4. 핵심 도메인 API 구현 (Applications, Events, Documents)
- [x] Step 5. 핵심 화면 UI 구현 (Dashboard, Board, Detail)
- [ ] Step 6. 파일 업로드 기능 구현 (Supabase Storage)
- [ ] Step 7. 알림 시스템 구현 (Resend + Cron)
- [ ] Step 8. 배포 및 최종 검증 (Vercel)

## 🛠 시작하기

```bash
# 의존성 설치
pnpm install

# 개발 서버 실행
pnpm dev

# DB 타입 생성 (Supabase 연동 시)
pnpm db:types
```

## 📜 라이선스

이 프로젝트는 학습 목적으로 제작되었습니다.
