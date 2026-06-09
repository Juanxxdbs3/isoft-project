# MindBridge — Estado del proyecto

## Frontend (Next.js 16, TypeScript, Tailwind v4, shadcn/ui)

### Completado ✅

- [x] Configuración shadcn/ui con Tailwind v4
- [x] Tipos de dominio (`src/frontend/src/types/domain.ts`)
- [x] Landing page, login, registro con validación. Suspense boundaries.
- [x] Tokens de color y tema — palette verde estudiante, slate/púrpura psicólogo. CSS variables centralizadas en `globals.css`.
- [x] Traducción i18n de enums (`lib/i18n/risk.ts`)
- [x] Foro del estudiante — Feed con sidebar fijo, paginación, crear post, detalle + comentarios
- [x] Perfil con historial de publicaciones propias — localStorage, DiceBear avatars, fecha membresía
- [x] Avatar modal interactivo — Rejilla 6 estilos DiceBear (open-peeps, bottts, avataaars, identicon, adventurer, lorelei). Reemplaza input de texto manual.
- [x] Dashboard del psicólogo — Route group `(psychologist)/layout.tsx` + `dashboard/page.tsx` NOTA: AÚN NO TIENE NINGUNA FUNCIONALIDAD, SOLO HAY UN ARCHIVO INICIAL.
- [x] Integración con backend real — Forum CRUD, JWT fix, avatar endpoint
- [x] TypeScript limpio — `npx tsc --noEmit` pasa sin errores
- [x] ChatWidget componente modular (`components/chat/chat-widget.tsx`) — props `roomId`, `currentUserId`, `currentUserRole`. Responsive (flotante desktop, fullscreen mobile). Conexión Realtime vía Supabase broadcast.
- [x] TypeScript compilation clean (zero errors across 300+ files)
- [x] Fix 401 Unauthorized on forum endpoints — pasa token desde localStorage a `apiGet`
- [x] Avatar modal con 12 opciones DiceBear — rejilla 4×3, guarda en BD + localStorage
- [x] Componente Avatar acepta prop `url` opcional (renderiza URL real si presente)
- [x] Edge Middleware (`middleware.ts`) — protege rutas `/foro`, `/perfil`, `/configuracion`, `/chat`, `/dashboard` con matchers estrechos
- [x] Login setea cookies (`access_token`, `role`) además de localStorage
- [x] Interceptor 401 en `api.ts` — limpia sesión y redirige a `/login`; excluye `/auth/login` y `/auth/register`
- [x] Página de Configuración completa — 5 secciones (Datos Complementarios, Seudónimo, Seguridad, Apariencia, Zona de Peligro); conectada a `PATCH /students/me`
- [x] ChatWidget refactorizado — extraído a `chat-header.tsx`, `chat-message.tsx`, `chat-input.tsx`
- [x] Nav condicional "Chat de Apoyo" en sidebar — visible solo si `caso_formal_activo = true`
- [x] Página `/chat` del estudiante — full-page route con mock messages; room discovery via GET /chat/rooms/active
- [x] Panel psicólogo en `/dashboard/chat` — ChatWidget con UUIDs de prueba
- [x] Rol mapping utility `mapSenderRole()` en `types/domain.ts`
- [x] Student layout reescrito como async server component con `cookies()` + `redirect()` (sin `<AuthGuard>` cliente)
- [x] Forum posts y comments incluyen `avatar_url` en todos los endpoints
- [x] `PostSummary` y `CommentItem` en `domain.ts` llevan `avatarUrl`
- [x] `post-card.tsx`, `comment-thread.tsx`, `user-badge.tsx` renderizan `<Avatar>` con `avatarUrl` real
- [x] Profile posts tab maneja array plano del backend
- [x] `API_BASE` exportado desde `src/frontend/src/lib/api.ts`
- [x] Footer usa CSS variables `--footer-bg`, `--footer-text`, `--footer-muted`

### Pendiente 🔲

- [ ] Soft delete (RF11)
- [ ] Edición con nuevo ciclo NLP (RF12)
- [ ] Detalle de alerta con puntuaciones NLP (RF14)
- [ ] Aceptación de caso con optimistic concurrency (RF19)
- [ ] Integrar ChatWidget en páginas de psicólogo y estudiante (RF23)

## Backend (Fastify 5, TypeScript)

### Completado ✅

- [x] `.env.example` con variables críticas
- [x] Módulo Auth — register, login, check-pseudonym, me, logout, password-reset (`/api/v1/auth/*`)
- [x] Módulo Forum — CRUD posts + comments + 4 GET endpoints + avatar PATCH (`/api/v1/forum/*`)
- [x] JWT fix — `fastify.jwt.decode()` + Supabase Auth `getUser()` para compatibilidad con tokens Supabase
- [x] `/auth/me` — Retorna `avatar_url` + `updated_at` vía PostgREST embedded join `student_active_pseudonym_id_fkey`
- [x] RLS policies — `post_select_all_authenticated` y `comment_select_all_authenticated` para VISIBLE
- [x] Módulo Students — `PATCH /api/v1/students/me` actualiza `complementary_data` (upsert), `pseudonym.texto`, y contraseña vía `supabase.auth.admin.updateUserById()`
- [x] Módulo Chat — `POST /api/v1/chat/rooms/:roomId/messages` (201) + `GET /api/v1/chat/rooms/:roomId/messages` (paginación cursor). Verifica membresía de sala. Dispara trigger Realtime en DB.
- [x] TypeScript limpio — `npx tsc --noEmit` pasa sin errores
- [x] Fix bug crítico en `chat.service.ts` — membership check ahora usa JOIN a `clinical_case` en lugar de `chat_room.student_id` (que no existe)
- [x] Nuevo endpoint `GET /api/v1/chat/rooms/active` — devuelve sala activa del estudiante o lista de salas del psicólogo
- [x] TypeScript compilation clean
- [x] Auth middleware fallback a DB query cuando JWT metadata falta (queries `student` luego `psychologist` table)
- [x] `auth.service.ts` `getRolId()` con improved error logging; queries `ESTUDIANTE` / `PSICOLOGO` table names
- [x] Chat service usa `chat_room_id` column; membership check via `case:clinical_case!inner(student_id)` join
- [x] `rooms/active` registrado antes de `rooms/:roomId` para evitar route conflict
- [x] Forum service retorna `avatar_url` en todos los endpoints post/comment

### Pendiente 🔲

- [ ] Módulo Alerts: GET /alerts, GET /alerts/:id, POST /:id/accept, PATCH /:id/status
- [ ] Módulo Cases: GET /cases, GET /cases/:id, POST /cases, PATCH /:id/formal-active
- [ ] Módulo Export: POST /cases/:id/export, generación PDF, Gmail API
- [ ] Módulo Notifications: GET, PATCH read
- [ ] Módulo Psychologist Settings: forum-participation, email-alerts
- [ ] Cola de reintentos NLP (3 intentos, backoff exponencial)
- [ ] Tests de integración por módulo

## Motor NLP (Python 3.13, FastAPI, BETO, spaCy)

### Completado ✅

- [x] Esqueleto FastAPI con routers (/api/v1/analyze, /health)
- [x] Pipeline de análisis con SafetyFilter léxico + preprocesador spaCy
- [x] Esquemas Pydantic v2 con nombres bilingües
- [x] Tests de pipeline (test_safety_filter, test_pipeline_stratification, test_pydantic_validation)
- [x] Modelo clínico BETO entrenado (clinical_model_v1/):
  - F1 suicida: 0.816
  - F1 depresión: 0.564 (por debajo del objetivo 0.60)
  - F1 ansiedad: 0.595 (por debajo del objetivo 0.60)
- [x] BETOClinicalModel integrado en pipeline reemplazando ModelStub
- [x] Endpoint renombrado: `/analizar` → `/api/v1/analyze`

### Pendiente / Bloqueado 🔲

- [x] **BLOQUEANTE RESUELTO**: Artefactos BETO completos — `vocab.txt` y `special_tokens_map.json` generados
- [ ] Resolver estrategia de despliegue para model.safetensors (~800MB) — HF Hub / Supabase Storage / Git LFS
- [ ] Corregir `prepare_datasets.py` (etiquetas depresión/ansiedad en 0)
- [ ] Retrain / fine-tuning para alcanzar F1 depresión ≥ 0.60, ansiedad ≥ 0.60
- [ ] Clasificador de normas de comunidad (~300 ejemplos)
- [ ] Tests de latencia p95 < 5s

## Infraestructura (Supabase, RLS, despliegue)

### Completado ✅

- [x] Schema SQL v1.1 (`docs/models/schema_mindbridge_v1.1.sql`)
- [x] `.env.example` para los tres servicios
- [x] Triggers Realtime — `trg_chat_message_broadcast` en `chat_message` para broadcast a `room:<room_id>:messages`
- [x] Schema SQL v1.1 desplegado en Supabase
- [x] Datos de prueba insertados (psicólogo, caso clínico, sala de chat)
- [x] Triggers Realtime funcionando para chat

### Pendiente 🔲

- [ ] RLS: tablas inmutables (registration_consent, nlp_analysis, informed_consent_signature, export_case)
- [ ] RLS: aislamiento por campus para psicólogo
- [ ] RLS: aislamiento del estudiante (solo sus registros)

## Testing (Node.js integration/smoke tests)

### Completado ✅

- [x] 148 integration/smoke tests creados como standalone Node scripts
- [x] 143 tests pasan, 0 fallan

## Stabilization Sprint (2026-06-09)

The ninth stabilization sprint resolved 9 issues across backend, frontend and infrastructure.

### Completado ✅

- [x] **A — Comment count in forum**: Backend `forum.service.ts` subselect `comment:comments(count)` in `listPosts`, `getMyPosts`, `getPostById` + `commentCount` in mappers
- [x] **B — Case-insensitive pseudonyms**: Backend auth & students service use `.ilike()` for lookup, `.toLowerCase()` on insert; schema index changed to `LOWER("texto")`
- [x] **C — Account deletion endpoint (new)**: `DELETE /auth/account` with password verification via `signInWithPassword`, then soft-deletes setting `status = 'DELETED'`
- [x] **D — Supabase signOut on logout**: Frontend config page logout + 401 interceptor both call `supabase.auth.signOut()`
- [x] **E — Avatar preservation on pseudonym change**: Backend selects `id, avatar_url` and passes `avatar_url` to new pseudonym INSERT
- [x] **F — CORS config**: `CORS_ORIGIN` env var added; dev uses `origin: true`, production uses configured origin
- [x] **G — Custom scrollbar**: `.custom-scrollbar` class with `::-webkit-scrollbar` rules in `globals.css`; applied to chat message containers
- [x] **H — Dynamic avatar sync**: Avatar modal dispatches `CustomEvent('avatar-changed')`; `UserBadge` listens and updates state reactively
- [x] **I — Mobile Navbar**: Landing page "Ingresar" text hidden on mobile, replaced with `LogIn` icon; responsive padding/text sizing

## Dependencias de bloqueo

- Schema Supabase desplegado → Backend puede conectar BD en producción
- Backend endpoints Auth → Frontend puede integrar auth real
- Backend endpoints Forum+NLP → Frontend puede integrar foro real
- Dataset corregido → Re-fine-tuning del modelo clínico
- Modelo NLP entrenado y artefactos completos → Reemplazar ModelStub en producción
