# MindBridge — Estado del proyecto

## Frontend (Next.js 16, TypeScript, Tailwind v4, shadcn/ui)

### Completado ✅
- [x] Configuración shadcn/ui con Tailwind v4
- [x] Tipos de dominio (`src/frontend/src/types/domain.ts`)
- [x] Landing page
- [x] Tokens de color y tema (Design.md)
- [x] Traducción i18n de enums (`lib/i18n/risk.ts`)

### En ejecución / Pendiente 🔲
- [x] Registro, login, middleware auth — Landing page, login, registro con validación. Suspense boundaries. Pseudonym stored in localStorage.
- [x] Foro del estudiante — Feed layout con sidebar fijo. Paginación por cursor. Crear post. Detalle + comentarios.
- [x] Perfil con historial de publicaciones propias — Reads from localStorage. Shows pseudonym, campus, created_at. DiceBear avatars.
- [ ] Soft delete (RF11)
- [ ] Edición con nuevo ciclo NLP (RF12)
- [x] Dashboard del psicólogo — Route group `(psychologist)/layout.tsx` + `dashboard/page.tsx` created
- [ ] Detalle de alerta con puntuaciones NLP (RF14)
- [ ] Aceptación de caso con optimistic concurrency (RF19)
- [ ] Chat básico psicólogo–estudiante (RF23)
- [x] Integración con backend real — Forum CRUD endpoints created. JWT fix applied. Avatar endpoint added.

## Backend (Fastify 5, TypeScript)

### Completado ✅
- [x] `.env.example` con variables críticas
- [x] Módulo Forum: CRUD posts y comments — `POST /api/v1/forum/posts`, `PATCH /api/v1/forum/posts/:postId`, `DELETE /api/v1/forum/posts/:postId`, `POST /api/v1/forum/posts/:postId/comments`, `PATCH /api/v1/forum/comments/:commentId`, `DELETE /api/v1/forum/comments/:commentId`
- [x] Forum GET endpoints — `GET /api/v1/forum/posts` (paginated), `GET /api/v1/forum/posts/mine` (authenticated), `GET /api/v1/forum/posts/:postId` (detail), `GET /api/v1/forum/posts/:postId/comments` (comments list)
- [x] Avatar endpoint — `PATCH /api/v1/forum/profile/avatar` updates pseudonym.avatar_url
- [x] JWT fix — Changed from `request.jwtVerify()` to `fastify.jwt.decode()` for local decoding
- [x] `/auth/me` endpoint — Returns `avatar_url` and `updated_at` from student + pseudonym join via PostgREST embedded relationship
- [x] RLS policies — `post_select_all_authenticated` and `comment_select_all_authenticated` created for public visibility of VISIBLE posts/comments

### Pendiente 🔲
- [ ] Inicializar proyecto Fastify 5 con TypeScript
- [ ] Módulo Auth: register, login, check-pseudonym, logout, password-reset
- [ ] Módulo Alerts: GET /alerts, GET /alerts/:id, POST /:id/accept, PATCH /:id/status
- [ ] Módulo Cases: GET /cases, GET /cases/:id, POST /cases, PATCH /:id/formal-active
- [ ] Módulo Chat: crear sala, GET mensajes, POST mensaje, PATCH status
- [ ] Módulo Export: POST /cases/:id/export, generación PDF, Gmail API
- [ ] Módulo Notifications: GET, PATCH read
- [ ] Módulo Psychologist Settings: forum-participation, email-alerts
- [ ] Cola de reintentos NLP (3 intentos, backoff exponencial)
- [ ] Tests de integración por módulo

## Motor NLP (Python 3.13, FastAPI, BETO, spaCy)

### Completado ✅
- [x] Esqueleto FastAPI con routers (/analizar, /health)
- [x] ModelStub funcional con pipeline de análisis
- [x] Preprocesador de texto (spaCy)
- [x] SafetyFilter léxico
- [x] Esquemas Pydantic v2 con nombres bilingües (alias en español)
- [x] Tests de pipeline (test_safety_filter, test_pipeline_stratification, test_pydantic_validation)
- [x] Modelo clínico BETO entrenado (clinical_model_v1/):
  - F1 suicida: 0.816
  - F1 depresión: 0.564 (por debajo del objetivo 0.60)
  - F1 ansiedad: 0.595 (por debajo del objetivo 0.60)
- [x] Modelo integrado en pipeline (BETOClinicalModel reemplaza ModelStub)
- [x] Endpoint renombrado: `/analizar` → `/api/v1/analyze`

### Pendiente / Bloqueado 🔲
- [x] **BLOQUEANTE RESUELTO**: Artefactos BETO completos — `vocab.txt` y `special_tokens_map.json` generados
- [ ] Resolver estrategia de despliegue para model.safetensors (~800MB)
- [ ] Corregir `prepare_datasets.py` (etiquetas depresión/ansiedad en 0)
- [ ] Verificar conteos contra `dataset_stats.json` antes de fine-tuning
- [ ] Retrain / fine-tuning para alcanzar F1 depresión ≥ 0.60, ansiedad ≥ 0.60
- [ ] Clasificador de normas de comunidad (~300 ejemplos)
- [ ] Tests de latencia p95 < 5s

## Infraestructura (Supabase, RLS, despliegue)

### Completado ✅
- [x] Schema SQL v1.1 (`docs/models/schema_mindbridge_v1.1.sql`)
- [x] `.env.example` para los tres servicios

### Pendiente 🔲
- [ ] Desplegar schema v1.1 en Supabase
- [ ] RLS: tablas inmutables (registration_consent, nlp_analysis, informed_consent_signature, export_case)
- [ ] RLS: aislamiento por campus para psicólogo
- [ ] RLS: aislamiento del estudiante (solo sus registros)

## Dependencias de bloqueo

- Schema Supabase desplegado → Backend puede conectar BD
- Backend endpoints Auth → Frontend puede integrar auth real
- Backend endpoints Forum+NLP → Frontend puede integrar foro real
- Dataset corregido → Re-fine-tuning del modelo clínico
- Modelo NLP entrenado y artefactos completos → Reemplazar ModelStub
