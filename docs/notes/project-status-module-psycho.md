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

### 1.2 Frontend — Pantalla de registro de psicólogo (admin mínimo) 🔲

- [ ] `src/frontend/src/app/admin/register-psychologist/page.tsx`

### 1.3 Frontend — Tema de psicólogo al layout ✅

- [x] Clase `.psychologist-theme` aplicada al `<div>` raíz del layout `(psychologist)/layout.tsx`

## Sesión 2 — Capa de repositorios para alertas y casos 🔲

### 2.1 Interfaces

- [ ] `IAlertRepository` en `repositories/interfaces.ts`
- [ ] `ICaseRepository` en `repositories/interfaces.ts`
- [ ] `IChatRepository` en `repositories/interfaces.ts`

### 2.2 Implementaciones

- [ ] `repositories/alert.repository.ts`
- [ ] `repositories/case.repository.ts`
- [ ] `repositories/chat.repository.ts`

### 2.3 Tipos de dominio

- [ ] `AlertStatus`, `CaseStatus`, `CaseType`, `ChatStatus`, `MessageType`, `MessageSenderRole`, `ShiftType`, `RiskLevel`
- [ ] `AlertSummary`, `AlertDetail`

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

## Sesión 5 — Frontend: dashboard y lista de alertas 🔲

- [ ] `(psychologist)/dashboard/page.tsx` (reemplazar stub)
- [ ] `(psychologist)/dashboard/layout.tsx` (sidebar fijo)
- [ ] `components/alerts/alert-card.tsx`
- [ ] `components/alerts/alert-list.tsx`
- [ ] `components/alerts/risk-badge.tsx`
- [ ] Realtime suscripción a nuevas alertas

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
