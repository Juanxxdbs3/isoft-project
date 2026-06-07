# Decisiones de diseño canónicas

Estas decisiones están cerradas. No se reabren sin justificación explícita documentada
y actualización del número de versión del contrato correspondiente.

---

## API URL base centralizada

**Date:** 2026-06-07
**Context:** Frontend was calling `http://localhost:3001` but backend API routes are under `/api/v1`, causing 404 errors on register/login.
**Decision:** Fixed `.env.local` to `NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1`. All backend calls use this base URL.
**Consequence:** All fetch calls to backend endpoints are relative to `/api/v1`, eliminating path duplication.

---

## CAMPUS constant extracted to shared file

**Date:** 2026-06-07
**Context:** Campus list (11 campuses) was duplicated across `registro/page.tsx` and `lib/i18n/risk.ts`.
**Decision:** Created `src/frontend/src/lib/campus.ts` with all campuses as const. Both files import from it.
**Consequence:** Single source of truth for campus data. Changes propagate automatically.

---

## Student code validation rules

**Date:** 2026-06-07
**Context:** Student code format needed stricter validation beyond length and academic program checks.
**Decision:** Both backend (`src/backend/src/lib/student-code.ts`) and frontend (`src/frontend/src/lib/student-code.ts`) validate:
- Entry period (digits 4-6): last digit must be 1 or 2
- Special community (digit 7): must be 0 or 1
- Admission position (digits 8-10): must be 001-999
- Plus existing checks: 10 digits, valid academic program
**Consequence:** Consistent validation across frontend and backend. Invalid codes rejected early.

---

## Forum sidebar fixed positioning

**Date:** 2026-06-07
**Context:** Sidebar was inside `max-w-6xl mx-auto`, causing it to shift with responsive layout.
**Decision:** Sidebar changed to `fixed left-0 top-14` (flush against left edge). Main content uses `pl-56` offset + `max-w-6xl mx-auto` for centering.
**Consequence:** Sidebar stays fixed while content scrolls. Consistent left alignment across all screen sizes.

---

## Dark mode colors centralized in globals.css

**Date:** 2026-06-07
**Context:** Dark mode colors were scattered across components with hardcoded `dark:` overrides.
**Decision:** Centralized all dark mode colors in `.dark` block in `globals.css`:
- Background: `#022c22` (emerald-950)
- Surface: `#064e3b` (emerald-900)
- Sidebar: `#052e22`
- Text: `#e5e7eb` (gray-200)
- Muted: `#6ee7b7` (emerald-300)
- Primary: `#34d399` (emerald-400)
- Accent: `#a3e635` (lime-400)
- Border: `#065f46` (emerald-800)
**Consequence:** All components use semantic classes (`bg-surface`, `text-foreground`, `text-muted`, `bg-sidebar`) that adapt via CSS variables. No hardcoded dark: overrides needed.

---

## Backend table names English

**Date:** 2026-06-07
**Context:** `forum.service.ts` was using Spanish table names (`publicacion`/`comentario`) that don't match actual schema.
**Decision:** Changed to English table names (`post`/`comment`) to match schema. Removed `pseudonym` column from inserts (doesn't exist in schema).
**Consequence:** Forum CRUD endpoints work correctly with actual database schema.

---

## JWT decoding strategy

**Date:** 2026-06-07
**Context:** `request.jwtVerify()` was failing with "invalid algorithm" error when using Supabase tokens.
**Decision:** Changed from `request.jwtVerify()` to `fastify.jwt.decode()` for local decoding. Real verification relies on `supabase.auth.getUser()`.
**Consequence:** Supabase JWT tokens decode successfully. Verification happens at Supabase level, not locally.

---

## DiceBear avatars with pseudonym seed

**Date:** 2026-06-07
**Context:** Avatars needed to be deterministic and unique per student without storing images.
**Decision:** Use DiceBear Open Peeps API (`https://api.dicebear.com/10.x/open-peeps/svg?seed=<pseudonym>`). Avatar seed = pseudonym. `next.config.ts` updated with `images.remotePatterns` for `api.dicebear.com`.
**Consequence:** Each student gets a unique, consistent avatar. No image storage needed. Avatar URL stored in `pseudonym.avatar_url`.

---

## Pseudonym stored in localStorage

**Date:** 2026-06-07
**Context:** Student identity needed to persist across page reloads without backend calls.
**Decision:** Login stores `identifier` as `pseudonym` in localStorage. Also stores `created_at` and `avatar_url` from `/auth/me` response.
**Consequence:** Profile page reads from localStorage. No additional API calls needed for basic student info.

---

## Separación identidad / seudónimo

**Context:** El sistema requiere anonimato controlado: el estudiante opera bajo seudónimo
pero la identidad real debe ser recuperable bajo condiciones autorizadas.
**Decision:** `student.active_pseudonym_id` → tabla `pseudonym` con FK diferida.
La clase `IdentityResolutionRing` del modelo conceptual se absorbe en esta relación.
El aislamiento se delega a `ISecurityAndAccess.deanonymize()`.
**Consequence:** No existe tabla separada para la resolución de identidad.
La de-anonimización ocurre en la capa de aplicación, no en SQL.

---

## Moderación retroactiva

**Context:** D-09 establece que el contenido debe publicarse de inmediato sin moderación previa.
**Decision:** El contenido es visible al instante (`status = VISIBLE`). La moderación ocurre
después del análisis NLP o mediante acción manual. El `status` se actualiza a `MODERATED`
retroactivamente.
**Consequence:** Un estudiante puede ver su contenido publicado y luego verlo desaparecer.
El flujo de publicación responde 201 antes de que el análisis termine.

---

## Normas de comunidad: campo binario único

**Context:** El contrato NLP v6 distingue entre agresión interpersonal y discurso de odio
como posibles dimensiones separadas.
**Decision:** MVP usa un único campo binario `cumple_normas`. La distinción `v_agresion`/`v_odio`
es extensión futura. `cumple_normas = false` se reserva exclusivamente para contenido
agresivo hacia terceros.
**Consequence:** El malestar del autor, incluida la ideación suicida, produce siempre
`cumple_normas = true`.

---

## Enums en inglés en BD y API

**Decision:** Todos los valores de enum almacenados en PostgreSQL y retornados por la API
están en `UPPER_SNAKE_CASE` inglés. La traducción al español para la UI ocurre en
`frontend/src/lib/i18n/risk.ts`.
**Consequence:** Nunca renderizar un valor de enum directamente en la UI sin pasar por el
diccionario de traducción.

---

## Paginación del foro por cursor

**Decision:** Cursor basado en `created_at` (ISO 8601). Sin scroll infinito.
El frontend envía el cursor del último elemento visible en cada solicitud.
**Consequence:** Implementación sin `OFFSET`. Consistente ante inserciones concurrentes.

---

## Turnos del psicólogo

**Decision:** `SHIFT_1` 07:00–14:59:59, `SHIFT_2` 15:00–21:59:59 (America/Bogota, UTC-5).
Alertas `LOW`/`MEDIUM`: solo psicólogos en turno activo.
Alertas `HIGH`: todos los psicólogos del campus, sin importar turno.
**Consequence:** El cálculo de turno activo vive en `NotificationService` del backend.
La zona horaria se inyecta desde config, no hardcodeada.

---

## Self-referral

**Decision:** `POST /cases` con `{ "case_type": "SELF_REFERRAL" }`. Listado en
`GET /cases?case_type=SELF_REFERRAL`.
**Consequence:** Un estudiante no puede tener dos casos `SELF_REFERRAL` activos simultáneamente
(`409 ACTIVE_SELF_REFERRAL_EXISTS`).

---

## Roles en MVP

**Decision:** Solo `Estudiante` y `Psicólogo` tienen interfaz en el sistema.
`Administrador` y `Superadministrador` se gestionan directamente desde Supabase Studio en esta versión.
**Consequence:** Los roles están en el catálogo `rol` del schema pero sus rutas no se implementan en el MVP.

---

## NLP: ningún dato de identidad al modelo

**Decision:** El microservicio NLP recibe únicamente el hash del seudónimo, el texto
y el timestamp. Nunca recibe código estudiantil, nombre, campus ni ningún identificador real.
**Consequence:** La de-anonimización ocurre en el backend, después de que el NLP retorna el resultado.

---

## PostgREST embedded join: FK constraint naming for `/auth/me`

**Date:** 2026-06-07
**Context:** `/auth/me` endpoint failing with PGRST200 ("Could not find a relationship between 'student' and 'pseudonym'"). PostgREST embedded join syntax requires exact FK constraint name match.
**Decision:** Use named FK constraint `student_active_pseudonym_id_fkey` on `student.active_pseudonym_id → pseudonym.id` (ON DELETE SET NULL). PostgREST embedded join hint: `pseudonym!student_active_pseudonym_id_fkey(texto, avatar_url)`.
**Consequence:** PostgREST can resolve the circular relationship and return avatar_url + updated_at in profile response. The FK must be recreated with this exact name if database migration generates a different auto-generated name.

---

## PostgREST nested join for forum pseudonym resolution

**Date:** 2026-06-07
**Context:** Forum GET endpoints needed to resolve pseudonym text through two relationships: `post → student → pseudonym`. PostgREST requires explicit FK constraint names for nested joins.
**Decision:** Use nested join syntax: `student:student_id(campus, pseudonym:student_active_pseudonym_id_fkey(texto, avatar_url))`. This resolves the student's active pseudonym and its text in a single query.
**Consequence:** Forum endpoints return flattened `PostItem` with `pseudonym` field (string) instead of nested object. Reduces frontend complexity. Requires FK constraint name to be exactly `student_active_pseudonym_id_fkey`.

---

## RLS policies simplified to public visibility

**Date:** 2026-06-07
**Context:** Previous RLS policies isolated posts/comments per user or psychologist role. Forum GET endpoints needed to expose all VISIBLE content publicly.
**Decision:** Replace per-user/role policies with two simple policies: `post_select_all_authenticated` (SELECT WHERE `status = 'VISIBLE'`) and `comment_select_all_authenticated` (SELECT WHERE `status = 'VISIBLE'`). Both allow authenticated users to see all visible content.
**Consequence:** Forum feed is publicly readable (no auth required for GET). Content moderation is retroactive: posts start VISIBLE, then change to MODERATED if flagged. Simplifies RLS model and improves performance (fewer policy checks).
