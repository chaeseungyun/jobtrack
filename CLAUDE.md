# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start development server
pnpm build        # Production build (completion = done criterion)
pnpm lint         # Run ESLint
pnpm test         # Run Vitest in watch mode
pnpm test:run     # Run tests once (CI mode)
pnpm db:types     # Regenerate TypeScript types from Supabase schema
```

## Principles

- **Server Components first** — use Client Components only when necessary (interactivity, browser APIs, hooks)
- **shadcn/ui first** — reuse existing primitives before building custom UI
- **Minimal changes** — preserve existing structure and patterns; don't refactor beyond what's asked
- **Completion criterion**: `pnpm build` must succeed

## Work Rules

- When creating or modifying an API route, update `public/openapi.json` (Swagger spec) immediately. Swagger UI is available at `/swagger`.
- When modifying architecture or significant code, update the relevant docs in `docs/`.
- Context docs to read for broader understanding: `docs/prd.md`, `docs/architecture.md`

## Architecture

### Layered Architecture (3-tier + DI)

```
HTTP Request
    ↓
[Route Handler] src/app/api/**/route.ts   — validates auth & input, calls Service
    ↓
[Service] src/lib/core/services/          — business logic, no DB knowledge
    ↓
[Repository Interface] src/lib/core/repositories/interfaces/
    ↓
[Repository Impl] src/lib/core/repositories/supabase/
    ↓
Supabase (PostgreSQL)
```

Dependency injection is wired in `src/lib/containers/`. Each domain has its own container (e.g., `application.container.ts`, `parsing.container.ts`).

### Key Directories

| Path | Purpose |
|------|---------|
| `src/app/api/` | BFF API route handlers (controllers) |
| `src/app/` | Next.js pages (App Router) |
| `src/components/ui/` | shadcn/ui primitives |
| `src/components/islands/` | Interactive client components |
| `src/lib/core/services/` | Business logic layer |
| `src/lib/core/repositories/` | Data access layer (interfaces + Supabase impls) |
| `src/lib/containers/` | DI wiring per domain |
| `src/lib/query/` | React Query hooks (client-side data fetching) |
| `src/lib/validation/` | Zod schemas for request validation |
| `src/lib/auth/` | JWT, session helpers, password hashing |
| `src/lib/parse/` | Job posting parsing types, mapper, merge logic |
| `public/openapi.json` | Swagger/OpenAPI spec (keep in sync with API changes) |

### Authentication

JWT stored in HttpOnly cookie `jobtrack_auth` (7-day expiry).
- Server components: `requireServerAuth()`
- API routes: `requireAuth()`
- Callback URL safety: `getSafeCallbackUrl()` — only relative URLs allowed

### Job Parsing Pipeline (`/api/applications/parse`)

URL → Scraper (NativeScraper → ScrapingBee fallback) → HTML → OpenAI LLM extraction → field mapping → merge with existing data. Site-specific adapter configs control selectors and removal rules.

### Error Handling

Use `AppError` from `src/lib/core/errors.ts` for domain errors. API responses use `toErrorResponse()` from `src/lib/api/`.
