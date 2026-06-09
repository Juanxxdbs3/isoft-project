# MindBridge — AGENTS.md

## Monorepo layout

```
src/
├── frontend/       Next.js 16, TypeScript, Tailwind v4, shadcn/ui
├── backend/        Fastify 5, TypeScript — NOT YET INITIALIZED
└── nlp_engine/     Python 3.13, FastAPI, BETO, spaCy
```

Each service is independent (no root `package.json`). Commands run from `src/<service>/`.

## OpenCode subagents

Per-agent instructions live in `.opencode/agents/*.md` — read those before writing code.

| Agent | File | Scope |
|-------|------|-------|
| `@infrastructure` | `.opencode/agents/infraestructure.md` | SQL, RLS, env vars |
| `@backend` | `.opencode/agents/backend.md` | Fastify, JWT, services |
| `@frontend` | `.opencode/agents/frontend.md` | Next.js, components, auth |
| `@nlp` | `.opencode/agents/nlp.md` | FastAPI, models, pipeline |
| `@qa` | `.opencode/agents/qa.md` | Tests |
| `@docs-updater` | `.opencode/agents/docs-updater.md` | Documentation |

## Developer commands

| Service | Command | Notes |
|---------|---------|-------|
| Frontend | `npm run dev` | → `next dev --turbopack -H 0.0.0.0` |
| Frontend lint | `npm run lint` | ESLint |
| NLP dev | `uvicorn src.main:app --reload` | From `src/nlp_engine/` |
| NLP tests | `pytest` | From `src/nlp_engine/` |
| Backend | *Not initialized* | Scaffolding pending |

**NLP endpoint:** `POST /api/v1/analyze` (replaces old `/analizar`)

## Architecture rules that differ from defaults

- **NLP risk_level** values are Spanish strings: `"bajo"`, `"medio"`, `"alto"`, `"alto_por_filtro_seguridad"`
- **NLP endpoint** is `/api/v1/analyze` (replaces old `/analizar`)
- **NLP schema** uses bilingual field names: `id_publicacion` on wire, `publication_id` in Python
- **Frontend domain types** mix Spanish (`Publicacion`) and English (`PostSummary`) naming — see `src/frontend/src/types/domain.ts`
- **Enums** are English `UPPER_SNAKE_CASE` in DB/API; translated via `lib/i18n/risk.ts` for UI
- **Pagination**: cursor-based on `created_at` (ISO 8601), no OFFSET, no infinite scroll
- **Content moderation**: immediately visible (`status = VISIBLE`); moderation is retroactive
- **Psychologist shifts**: SHIFT_1 07:00–14:59, SHIFT_2 15:00–21:59 (America/Bogota UTC-5). HIGH alerts notify all campus psychologists; LOW/MEDIUM only active shift
- **Student codes**: encrypted with AES-256-GCM, never persisted or logged in plaintext
- **Edge middleware** protects routes with narrow matchers: `/foro`, `/perfil`, `/chat`, `/configuracion`, `/panel`, `/dashboard`; login sets `access_token`/`role` cookies
- **Student layout** is async server component with `cookies()` + `redirect()` (no client-side `<AuthGuard>`)
- **Backend auth middleware** falls back to DB query when JWT metadata missing (queries `student` then `psychologist` table)
- **401 interceptor** in `api.ts` excludes `/auth/login` and `/auth/register` from redirect loop
- **Chat service** uses `chat_room_id` column; membership check via `case:clinical_case!inner(student_id)` join; `rooms/active` registered before `rooms/:roomId` to avoid route conflict
- **Forum endpoints** return `avatar_url` in all post/comment responses

## Critical constraints

- Frontend NEVER calls NLP directly — all communication passes through backend
- NLP receives only `hash(pseudonym)`, `text`, `timestamp`, `previous_context` — never real identity
- Self-referral: `409 ACTIVE_SELF_REFERRAL_EXISTS` if student already has active SELF_REFERRAL case
- MVP UI roles: `Estudiante` and `Psicólogo` only (Admin/Superadmin via Supabase Studio)
- AWS-style error format: `{ "error": "SCREAMING_SNAKE_CASE", "message": "..." }`
- **Circular FK dependency (CRITICAL):** `student.active_pseudonym_id` → `pseudonym.id` (FK name: `student_active_pseudonym_id_fkey`, ON DELETE SET NULL) + `pseudonym.student_id` → `student.id` (ON DELETE CASCADE). PostgREST `/auth/me` embedded join requires exact FK name `student_active_pseudonym_id_fkey`. If auto-generated name differs, recreate with correct name.

## NLP tests that must always stay green

`test_safety_filter`, `test_pipeline_stratification`, `test_pydantic_validation` (in `src/nlp_engine/tests/test_pipeline.py`)

## Status overview

See `docs/notes/project-status.md` for the full per-service task checklist. Key milestones:

| Area | State |
|------|-------|
| Frontend Fase 0 | ✅ Foundation (shadcn, tokens, domain types) |
| Frontend Fase 1 | ✅ Complete — Landing, login, register with validation, Suspense boundaries |
| Frontend Fase 2 | ✅ Complete — Forum feed with fixed sidebar, profile with localStorage, DiceBear avatars |
| Frontend Fase 3 | ✅ Complete — Psychologist route group, dashboard layout, chat integration |
| Frontend Fase 4 | ✅ Complete — Settings page, route security, chat widget, avatar modal (12 options) |
| Backend Auth | ✅ Complete — register, login, JWT fix, me endpoint |
| Backend Forum | ✅ Complete — CRUD posts + comments, avatar endpoint |
| Backend Chat | ✅ Complete — message CRUD, room discovery, Realtime triggers |
| NLP engine | ✅ Pipeline + modelo clínico integrados. F1 suicidal 0.816. Modo comunidad pendiente |
| Schema SQL v1.1 | ✅ Deployed — Supabase schema, test data, Realtime triggers working |
| Infrastructure | ✅ Supabase deployed, Realtime configured, test data inserted |

**Active blockers:** see `docs/notes/blockers.md` — modelo 800MB sin estrategia de despliegue.
