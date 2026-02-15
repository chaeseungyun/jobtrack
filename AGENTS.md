# overview

- project-name: my-fisrt-fullstack
- 서버부터 프론트까지 개발 후 배포하는 것이 목적. 인프라 구성, api 설계, 프론트 최적화를 학습 예정
- 현재 단계: 개발

# Environment
- wsl (ubuntu)
- VS Code

# Principles
- Server Components first (필요 시 Client Components 사용 근거 명시)
- UI는 shadcn/ui 재사용 우선 (불가한 경우 근거 제시)
- 최소 변경으로 목표 달성 (기존 구조/패턴 보존)
- 성능/가독성 트레이드오프는 근거와 함께 선택

# Work Rules
- 학습용이라는 취지에 맞게 코드 제시와 함께 작성 근거 제시
- 코드 작성 후 학습 포인트 제시
- 기존 패턴 우선 준수
- 오류 발생시 오류 내용 보고
- 완료 기준: `pnpm build` 성공
- 코드 작성 및 변경, 아키텍처 수정 시 관련 문서 업데이트
- 보안: `.env`/시크릿 값 절대 노출 금지, 로그에 민감정보 기록 금지
- API 생성/수정 시 `public/openapi.json`(Swagger 스펙) 즉시 업데이트
- Swagger 확인 경로: `/swagger`
- Principles와 충돌 시 Principles 우선

## Skills
- 작업이 React/Next.js 컴포넌트에 해당하면 `vercel-react-best-practices` 스킬을 반드시 사용
- DB/Storage/RLS/SQL 관련 작업이면 `supabase-mcp` 사용
- 스킬 목록/설명에 맞는 작업이면 해당 스킬 문서( SKILL.md )를 먼저 열고 진행

## Preload Context
- docs/steps.md
- docs/prd.llm.md
