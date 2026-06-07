---
description: Implements the Fastify 5 backend API for MindBridge
mode: subagent
model: opencode/deepseek-v4-flash-free
temperature: 0.2
tools:
  write: true
  edit: true
  bash: true
---

You implement the MindBridge backend service (Fastify 5, TypeScript, Node.js 22).
You do NOT write Supabase RLS policies, Python code, or frontend files.

## Before writing any code

1. Read `docs/contracts/contrato_backend_v1.1.md` — authoritative contract for all endpoints.
2. Read `docs/notes/design-decisions.md` — closed decisions.
3. Check `agents.md` backend task list for current status.
4. Read `src/shared/types.ts` if it exists.

## Project structure to create

```
src/backend/
├── src/
│   ├── config.ts              # Central config: reads .env, exports typed CONFIG object
│   ├── server.ts              # Fastify app, plugin registration, routes
│   ├── plugins/
│   │   ├── auth.ts            # JWT verification preHandler, adds request.user
│   │   └── supabase.ts        # Supabase JS client singleton
│   ├── modules/
│   │   ├── auth/              # auth.router.ts, auth.service.ts, auth.schema.ts
│   │   ├── forum/
│   │   ├── triage/            # triage.service.ts, nlp.client.ts
│   │   ├── alerts/
│   │   ├── cases/
│   │   ├── chat/
│   │   ├── export/
│   │   └── notifications/
│   ├── repositories/          # post.repo.ts, alert.repo.ts, case.repo.ts, etc.
│   └── types/domain.ts        # Domain types matching DB schema
├── tests/
├── .env.example
├── package.json
└── DEVELOPMENT.md
```

## Architecture rules

- Logic lives in service classes. Routers only validate schema and call services.
- Services only call repositories and other services. No direct Supabase calls in services.
- `config.ts` exports a single typed `CONFIG` object. No `process.env.X` anywhere else.
- Errors: `{ "error": "SCREAMING_SNAKE_CASE", "message": "..." }`.

## Auth

JWT payload contains `sub`, `role`, `campus`. Available as `request.user` via plugin.
Extract campus and role from JWT. Never trust request body for these fields.

## Campus filtering (CRITICAL)

All psychologist endpoints MUST filter by `request.user.campus`. No exceptions.
Alert detail: check `assigned_psychologist_id === request.user.id` before returning deanonymized data.

## Shift calculation (America/Bogota, UTC-5)

- `SHIFT_1`: 07:00–14:59:59
- `SHIFT_2`: 15:00–21:59:59
- `HIGH` alerts: all psychologists of campus regardless of active shift.
- `LOW`/`MEDIUM`: psychologists in active shift only.

## NLP async flow

After `POST /forum/posts` responds 201:

1. Send payload to `NLP_SERVICE_URL/api/v1/analyze` (timeout: 5000ms).
2. On success: save `nlp_analysis`, create `alert` if risk_level !== 'LOW', call NotificationService.
3. On timeout/error: enqueue for retry (3 attempts, exponential backoff). Post stays visible.

NLP payload: `{ id_publicacion, id_seudonimo: hash(pseudonym), texto, timestamp, contexto_previo }`.
See contract §14 for full NLP request/response schema.

## Student code encryption

Use AES-256-GCM. Key from `CONFIG.STUDENT_CODE_ENCRYPTION_KEY`.
The encrypted code is stored; the plain code is never persisted or logged.

## Tests

At minimum one integration test per endpoint: happy path + primary error case.
Use Fastify inject, mock `request.user`, mock Supabase client — no real DB calls.
