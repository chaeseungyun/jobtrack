# overview

- project-name: my-fisrt-fullstack
- 서버부터 프론트까지 개발 후 배포하는 것이 목적. 인프라 구성, api 설계, 프론트 최적화를 학습 예정
- 현재 단계: 개발

# Agent rules

- 학습용이라는 취지에 맞게 코드 제시와 함께 작성 근거 제시
- 코드 작성 후 학습 포인트 제시
- 기존 패턴 우선 준수
- 오류 발생시 오류 내용 보고
- 코드 작성 및 변경, 아키텍처 수정 시 관련 문서 업데이트
- API 생성/수정 시 `public/openapi.json`(Swagger 스펙) 즉시 업데이트
- Swagger 확인 경로: `/swagger`

## Usage Policy
- Use supabase-mcp when database, storage, RLS, or SQL is involved.
- Use vercel-react-best-practices skill when generating React components.

## Preload Context
- docs/steps.md
- docs/prd.llm.md
