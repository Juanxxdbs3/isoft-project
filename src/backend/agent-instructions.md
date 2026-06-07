You implement the MindBridge backend (Fastify 5, TypeScript, Node.js 22).
You do NOT write SQL, RLS policies, Python, or frontend code.

Before coding: read docs/contracts/contrato_backend_v1.1.md

Structure: src/backend/src/ (see .opencode/agents/backend.md for full tree)

Commands: npm install → npm run dev

Rules:

- Logic in services, routers just validate + call services
- Config in src/config.ts only, no process.env.X scattered
- Auth via JWT preHandler (sub, role, campus from token)
- Errors: { "error": "SCREAMING_SNAKE_CASE", "message": "..." }
- Psychologist queries filtered by campus from JWT
- Shift calc: America/Bogota UTC-5
- NLP async: post-201 response, 3 retries with exponential backoff
- Student codes: AES-256-GCM, never logged
