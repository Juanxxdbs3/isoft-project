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
- **NLP endpoint** is `/analizar` (Spanish); rename to `/api/v1/analyze` when replacing ModelStub
- **NLP schema** uses bilingual field names: `id_publicacion` on wire, `publication_id` in Python
- **Frontend domain types** mix Spanish (`Publicacion`) and English (`PostSummary`) naming — see `src/frontend/src/types/domain.ts`
- **Enums** are English `UPPER_SNAKE_CASE` in DB/API; translated via `lib/i18n/risk.ts` for UI
- **Pagination**: cursor-based on `created_at` (ISO 8601), no OFFSET, no infinite scroll
- **Content moderation**: immediately visible (`status = VISIBLE`); moderation is retroactive
- **Psychologist shifts**: SHIFT_1 07:00–14:59, SHIFT_2 15:00–21:59 (America/Bogota UTC-5). HIGH alerts notify all campus psychologists; LOW/MEDIUM only active shift
- **Student codes**: encrypted with AES-256-GCM, never persisted or logged in plaintext

## Critical constraints

- Frontend NEVER calls NLP directly — all communication passes through backend
- NLP receives only `hash(pseudonym)`, `text`, `timestamp`, `previous_context` — never real identity
- Self-referral: `409 ACTIVE_SELF_REFERRAL_EXISTS` if student already has active SELF_REFERRAL case
- MVP UI roles: `Estudiante` and `Psicólogo` only (Admin/Superadmin via Supabase Studio)
- AWS-style error format: `{ "error": "SCREAMING_SNAKE_CASE", "message": "..." }`

## NLP tests that must always stay green

`test_safety_filter`, `test_pipeline_stratification`, `test_pydantic_validation` (in `src/nlp_engine/tests/test_pipeline.py`)

## Status overview

See `docs/notes/project-status.md` for the full per-service task checklist. Key milestones:

| Area | State |
|------|-------|
| Frontend Fase 0 | ✅ Foundation (shadcn, tokens, domain types) |
| Frontend Fase 1 | ⚠️ Partial — only landing page (`/`). Login & register pending |
| Frontend Fase 2+ | 🔲 Forum, psychologist dashboard |
| Backend | 🔲 Not initialized |
| NLP engine | ✅ Pipeline + modelo clínico integrados. F1 suicidal 0.816. Modo comunidad pendiente |
| Schema SQL v1.1 | ✅ Written, not deployed |
| Infrastructure | 🔲 Supabase not deployed, RLS pending |

**Active blockers:** see `docs/notes/blockers.md` — schema not deployed, modelo 800MB sin estrategia de despliegue.
