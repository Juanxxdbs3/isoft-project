# Módulo del Psicólogo — Estado del Proyecto

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

## Sesión 3 — Backend: módulo de alertas 🔲

- [ ] `GET /api/v1/alerts`
- [ ] `GET /api/v1/alerts/:alertId`
- [ ] `POST /api/v1/alerts/:alertId/accept`
- [ ] `PATCH /api/v1/alerts/:alertId/status`

## Sesión 4 — Backend: módulo de casos y chat 🔲

- [ ] `GET /api/v1/cases`
- [ ] `GET /api/v1/cases/:caseId`
- [ ] `POST /api/v1/cases` (self-referral)
- [ ] `PATCH /api/v1/cases/:caseId/formal-active`
- [ ] `POST /api/v1/cases/:caseId/chat` (crear sala)
- [ ] `GET /api/v1/cases/:caseId/chat` (historial)
- [ ] `POST /api/v1/cases/:caseId/chat/messages`
- [ ] `PATCH /api/v1/cases/:caseId/chat` (archivar)

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

## Sesión 6 — Frontend: detalle de alerta y aceptación 🔲

- [ ] `(psychologist)/dashboard/alerts/[alertId]/page.tsx`
- [ ] `components/alerts/alert-detail-panel.tsx`
- [ ] `components/alerts/nlp-scores-panel.tsx`
- [ ] `components/alerts/post-history-list.tsx`

## Sesión 7 — Frontend: pantalla de chat del psicólogo 🔲

- [ ] `(psychologist)/dashboard/chat/page.tsx`
- [ ] `(psychologist)/dashboard/cases/[caseId]/chat/page.tsx`
- [ ] Adaptar `chat-widget.tsx` para rol psicólogo

## Deuda Técnica

- [ ] Migrar `auth.router.ts` de `NLP_SERVICE_BEARER_TOKEN` a `ADMIN_SECRET` para password-reset
