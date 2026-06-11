# Módulo del Psicólogo — Estado del Proyecto

> **Actualizado 2026-06-11:** Se documentó el fix definitivo del trigger Realtime: `realtime.send()` reemplazó a `broadcast_changes()` por type mismatch `record` vs `jsonb`.

Seguimiento específico para la implementación del módulo del psicólogo.
Ver plan completo en `docs/plans/psychologist_module_implementation_plan.md`.

## Sesión 1 — Fundación: registro de psicólogos y tema visual

### 1.1 Backend — Endpoint de aprovisionamiento de psicólogo ✅

- [x] `ADMIN_SECRET` en config.ts, .env, .env.example
- [x] `lib/roles.ts` con `getPsicologoRolId()` compartido (DRY)
- [x] `repositories/interfaces.ts` con `IPsychologistRepository`
- [x] `repositories/psychologist.repository.ts` (SupabasePsychologistRepository)
- [x] `modules/psychologists/psychologists.schema.ts` (Zod schemas)
- [x] `modules/psychologists/psychologists.service.ts` (createPsychologist)
- [x] `modules/psychologists/psychologists.router.ts` (POST /api/v1/admin/psychologists)
- [x] Router registrado en `server.ts`
- [x] `design-decisions.md` con AD-01

### 1.2 Frontend — Pantalla de registro de psicólogo (admin mínimo) ✅

- [x] `src/frontend/src/app/admin/register-psychologist/page.tsx` — formulario con manejo de estados (idle/loading/success/error)
- [x] POST a backend con cabecera `X-Admin-Secret` (input manual)
- [x] Feedback visual: banner verde con UUID en éxito, banner rojo con mensaje en error
- [x] Campos: nombre, correo, sede (select 11 campus), turno (select 2 shifts), contraseña, admin-secret

### 1.3 Frontend — Tema de psicólogo al layout y modularización ✅

- [x] Clase `.psychologist-theme` aplicada al `<div>` raíz del layout `(psychologist)/layout.tsx`
- [x] `PsychologistHeader.tsx` — componente cliente con nav, datos del psicólogo y ThemeToggle
- [x] `PsychologistSidebar.tsx` — componente cliente con sidebar fijo y active route highlight
- [x] Layout refactorizado como server component puro (invoca componentes, sin HTML inline)
- [x] Fix CSS: `.dark .psychologist-theme` agregado como selector descendiente para modo oscuro

### 1.4 Frontend — Correcciones UI y navegación ✅

- [x] Fuga verde en `/foro` corregida — Clase `.psychologist-theme` envuelve el branch psicólogo en `(student)/layout.tsx`
- [x] Chat residual removido — Enlace redundante eliminado de `psychologistNavLinks`
- [x] Nav centrada — Logo izquierda, Dashboard/Foro centro, usuario+ThemeToggle derecha
- [x] Sidebar colapsable — Protuberancia con flecha, transición w-56 ↔ w-14, iconos visibles
- [x] Botón Configuración en sidebar — Ruta `/dashboard/settings` con icono `Settings`
- [x] Enlace "Casos Archivados" — Navegación a `/dashboard/cases?status=ARCHIVED`
- [x] Saludo dinámico — "Buenos días/tardes/noches" según `new Date().getHours()`
- [x] `StatusToast` component — Notificaciones flotantes bottom-center con variantes

## Sesión 2 — Capa de repositorios para alertas y casos ✅

### 2.1 Interfaces ✅

- [x] `IAlertRepository` en `repositories/interfaces.ts`
- [x] `ICaseRepository` en `repositories/interfaces.ts`
- [x] `IChatRepository` en `repositories/interfaces.ts`

### 2.2 Implementaciones ✅

- [x] `repositories/alert.repository.ts`
- [x] `repositories/case.repository.ts`
- [x] `repositories/chat.repository.ts`

### 2.3 Tipos de dominio ✅

- [x] `Alert`, `ClinicalCase`, `ChatRoom`, `ChatMessage`, `NlpAnalysis` — interfaces en `types/domain.ts`
- [x] Enums ya existían: `AlertStatus`, `CaseStatus`, `CaseType`, `ChatStatus`, `MessageType`, `RiskLevel`

## Sesión 3 — Backend: módulo de alertas ✅

- [x] `GET /api/v1/alerts`
- [x] `GET /api/v1/alerts/:alertId`
- [x] `POST /api/v1/alerts/:alertId/accept`
- [x] `PATCH /api/v1/alerts/:alertId/status`

## Sesión 4 — Backend: módulo de casos y chat ✅

- [x] `GET /api/v1/cases`
- [x] `GET /api/v1/cases/:caseId`
- [x] `POST /api/v1/cases` (self-referral)
- [x] `PATCH /api/v1/cases/:caseId/formal-active`
- [x] `POST /api/v1/cases/:caseId/chat` (crear sala)
- [x] `GET /api/v1/cases/:caseId/chat` (historial)
- [x] `POST /api/v1/cases/:caseId/chat/messages`
- [x] `PATCH /api/v1/cases/:caseId/chat` (archivar)

## Sesión 5 — Frontend: dashboard y lista de alertas ✅

### 5.1 Tanda 1 — Layout base y componente AlertCard ✅

- [x] `(psychologist)/dashboard/layout.tsx` — `psychologist-theme` wrapper con `text-foreground`, sidebar con `sticky` positioning (revertido de `fixed` para evitar solapamiento del toggle button), items Dashboard/Chat activos, Mis Casos/Archivados/Configuración deshabilitados con `opacity-50 cursor-not-allowed`, padding a `p-4`, main padding `pl-6` expandido / `pl-20` colapsado.
- [x] `components/alerts/alert-card.tsx` — creado con RiskBadge reuse, Von Restorff effect (`border-l-4 border-l-risk-high` para HIGH), complementary micro-badge, botón accept que llama `POST /api/v1/alerts/:id/accept`, i18n vía `lib/i18n/risk.ts`.
- [x] `tsc --noEmit` pasa con 0 errores.

### 5.2 Tanda 2 — Lista de alertas y Realtime ✅

- [x] `(psychologist)/dashboard/page.tsx` — Server Component que fetchea `GET /api/v1/alerts` usando auth cookie, normaliza pseudonym, computa stat cards (total alerts, today alerts, HIGH alerts), renderiza `<AlertList>` con datos reales, preserva saludo y botones de filtro.
- [x] `components/alerts/alert-list.tsx` — Client Component con `useState` para lista local, `useEffect` con Realtime `postgres_changes` subscription en `alert` table filtrada por `campus` desde JWT claims, mapea cada alerta a `<AlertCard>`, renderiza empty state.
- [x] `components/alerts/risk-badge.tsx` — componente reutilizable con variantes de color (bajo/medio/alto/alto_por_filtro_seguridad), reusado en `AlertCard`.
- [x] Realtime suscripción a nuevas alertas integrada en `alert-list.tsx` mediante `supabase.channel().on('postgres_changes', ...)`.

## Sesión 6 — Frontend: detalle de alerta y aceptación ✅

### 6.1 Tanda 1 — Ruta de detalle, paneles y deanonymización ✅

- [x] `components/psychologist/welcome-greeting.tsx` — Client Component que fetchea `/auth/me` post-mount para mostrar el nombre real del psicólogo, eliminando el hydration mismatch. Dashboard `page.tsx` usa `<WelcomeGreeting />` en lugar de `"Psicólogo"` hardcodeado.
- [x] `components/alerts/alert-card.tsx` — Navegación envuelta en `<Link href={/dashboard/alerts/${id}}>`; botón accept usa `e.stopPropagation()`.
- [x] `(psychologist)/dashboard/alerts/[alertId]/page.tsx` — Server Component, fetchea `GET /api/v1/alerts/:id` con auth cookie, renderiza `<AlertDetailPanel>`.
- [x] `components/alerts/nlp-scores-panel.tsx` — Componente presentacional con 4 barras de puntuación (depresión, ansiedad, suicida, IMB), badge `suicidal_override`, RiskBadge.
- [x] `components/alerts/post-history-list.tsx` — Lista cronológica de posts, resalta coincidencia `trigger_text` con `bg-risk-high-bg/20 border-l-2 border-l-risk-high`.
- [x] `components/alerts/alert-detail-panel.tsx` — Client Component orquestador con anonimato RF21: sección deanonymized data usa `blur-[4px] pointer-events-none select-none` cuando status es PENDING, placeholders `••••••••` cuando `deanonymized_data` es null. Botón Accept con `router.refresh()` tras éxito. Banner de confirmación al aceptar.

Reusa `lib/i18n/risk.ts` y `forum/risk-badge.tsx` para todos los scores, i18n y traducciones de estado.

### 6.2 Tanda 2 — Estabilización ✅

- [x] **Hydration fix** (`components/alerts/alert-card.tsx`): Added `suppressHydrationWarning` to the date `<span>` to fix `toLocaleDateString` SSR/CSR mismatch.
- [x] **Script tag fix** (`app/layout.tsx`): Replaced Next.js `<Script>` with native `<script>` to avoid collisions on concurrent sessions.
- [x] **Filter + sort** (`app/(psychologist)/dashboard/page.tsx`): Alerts filtered to only show `status === "PENDING"`; sorted HIGH first.
- [x] **Realtime reactivity** (`components/alerts/alert-list.tsx`): Added `.on("UPDATE")` listener that removes alerts from the feed when status changes away from PENDING. INSERT handler now also respects HIGH-first ordering.
- [x] **Elegant 404/403 banner** (`app/(psychologist)/dashboard/alerts/[alertId]/page.tsx`): Replaced `notFound()` with styled banner: "Esta alerta ya ha sido asignada y está siendo atendida por otro especialista de salud mental" for 403, generic banner for 404.

`tsc --noEmit`: 0 errores en frontend.

## Sesión 7 — Chat del Psicólogo ✅

### 7.1 Tanda 1 — Chat page y componentes

- [x] **Chat page** (`app/(psychologist)/dashboard/chat/page.tsx`): Refactored to Server Component. Reads `?caseId=` searchParams. No param → shows case list (`ChatCaseList`). With param → shows split view (`ChatCaseView`).
- [x] **ChatCaseList** (`components/chat/chat-case-list.tsx`): Grid of cards for active cases (status=ASSIGNED). Shows anonymous_alias or truncated case ID. Click navigates to `/dashboard/chat?caseId=xxx`. Empty state when no cases.
- [x] **ChatCaseView** (`components/chat/chat-case-view.tsx`): Split layout. Left panel shows case info (identity, scores, future actions buttons). Right panel shows chat with Realtime subscription via `supabase.channel('case:{caseId}:messages').on('broadcast', ...)`. Chat is collapsible with button; when collapsed, case info panel expands to full width. Messages fetched from `GET /api/v1/cases/:caseId/chat`. Realtime cleanup on unmount/room change.
- [x] **PsychologistChatInput** (`components/chat/psychologist-chat-input.tsx`): Extended input with two action buttons: 📅 "Proponer cita" (sends APPOINTMENT_PROPOSAL type) and 📋 "Ficha caracterización" (sends CHARACTERIZATION_LINK type). Standard text input sends STANDARD_TEXT. Messages sent via `POST /api/v1/cases/:caseId/chat/messages`.

### 7.2 Infrastructure task delegated

- [x] DB trigger `trg_validate_alert_campus` creation delegated to `@infraestructure` agent (AD-07).

### 7.3 TypeScript

- [x] `tsc --noEmit`: 0 errors (frontend + backend).

## ✅ Enum Correction Sprint

- `ACCEPTED` was incorrectly used as a `clinical_case.status` value in documentation — it only exists in `alert.status`
- Frontend was sending `?status=ASSIGNED,ACCEPTED` to `/cases` causing 422 — now fixed
- `clinical_case.status` can be NULL in the DB but the enum type only has 4 values: `OPENED`, `ASSIGNED`, `ARCHIVED`, `RESOLVED`

## ✅ PGRST201 Fix en cases.service.ts

- [x] Replaced `pseudonym!active_pseudonym_id` with `pseudonym!fk_student_active_pseudonym` in `src/backend/src/modules/cases/cases.service.ts` to resolve `PGRST201: Could not embed because more than one relationship was found` for the `student.active_pseudonym_id → pseudonym.id` FK.

## ✅ Sesión A (Routing restructure)

- [x] `cases/page.tsx` created (moved from `dashboard/cases`)
- [x] `cases/[caseId]/page.tsx` stub created
- [x] `dashboard/chat/page.tsx` replaced with redirect to `/cases`
- [x] `PsychologistSidebar.tsx` updated (href → `/cases`, Chat item removed)
- [x] `chat-case-list.tsx` and `chat-case-view.tsx` links fixed
- [x] `dashboard/cases/` directory deleted
- [x] `tsc --noEmit` passes with 0 errors

## ✅ Sesión B (Unique case per student)

- [x] `alerts.service.ts` `acceptAlert()` now checks for existing active cases
- [x] If existing case found → reuses it, marks alert as `is_complementary = true`
- [x] If no existing case → creates new one, alert `is_complementary = false`
- [x] Links alert to case via `case_id`
- [x] Includes rollback on failure (reverts alert to PENDING)

## ✅ Sesión D — Chat funcional en detalle del caso

- [x] CaseChatShell wired to backend `POST /cases/:caseId/chat/messages` + `GET /cases/:caseId/chat` + Realtime broadcast subscription
- [x] Room auto-created on first visit (`POST /api/v1/cases/:caseId/chat` when `chat_room` is null) — botón "Iniciar conversación" en `cases/[caseId]/page.tsx`
- [x] Optimistic send with error rollback (message added locally before server response; reverted on failure with toast error)
- [x] Loading/error states in chat widget (spinner during send, error toast on failure, empty states when no messages)
- [x] `chat-widget.tsx` and `cases/[caseId]/page.tsx` modified — chat fully integrated into case detail view

### Realtime refuerzos en CaseChatShell

- [x] **setAuth JWT injection:** `useEffect` added calling `supabase.realtime.setAuth(token)` to inject JWT for private Realtime channels
- [x] **409 handling with GET fallback:** Room init now catches 409 (room already exists), detects via `err.status / statusCode / error / message`, and falls back to `GET /cases/:caseId/chat`
- [x] **Payload extraction 3-way null guard:** Incoming broadcast messages mapped via `payload.payload || record || payload` with `if (!msgData?.id) return` guard
- [x] **Dependencies stabilized:** Subscription `useEffect` uses `chatRoom?.id` (primitive string) instead of `chatRoom` (object reference)
- [x] **DB trigger fix — `realtime.send()` replaces `broadcast_changes()`:** The old function `on_chat_message_broadcast()` called `realtime.broadcast_changes()` which expects `record` type for args 6-7, not `jsonb` → PostgreSQL error 42883. Rewritten to use `realtime.send(payload jsonb, event text, topic text, private boolean)` which accepts `jsonb` directly. Cleanup: `trg_chat_message_broadcast` and `on_chat_message_broadcast()` dropped; `trg_chat_message_inserted` and `on_chat_message_inserted()` recreated. Audit root cause confirmed: `broadcast_changes()` type signature expects `record`, not `jsonb`, making it incompatible with the `row_to_json(NEW)::jsonb` pattern.

## Deuda Técnica

- [ ] Migrar `auth.router.ts` de `NLP_SERVICE_BEARER_TOKEN` a `ADMIN_SECRET` para password-reset
