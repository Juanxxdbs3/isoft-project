# Psychologist Module — Technical Plan

## Session prerequisites

- The student module is complete (stabilization sprint done).
- Backend, frontend, and NLP engine are running.
- **No `/init` needed** — the project scaffolding already exists:
  - `(psychologist)` route group in frontend
  - `auth.service.ts` handles JWT with psychologist role
  - `chat-widget.tsx` exists in components
  - Backend has auth, forum, chat, cases module structure

## What needs to be built

### 1. Dashboard (`/dashboard`)
**Backend:**
- `GET /api/v1/alerts` — list alerts for psychologist's campus (filtered by JWT campus)
- `GET /api/v1/alerts/stats` — counts by status and risk level
- `PATCH /api/v1/alerts/:id/accept` — accept an alert (assign self, create clinical case)
- `PATCH /api/v1/alerts/:id/dismiss` — mark as false positive

**Frontend:**
- Alert summary cards (pseudonym, risk badge, trigger text excerpt, timestamp)
- Accept/Dismiss buttons per card
- Stats summary (pending count, high-risk count)
- Real-time update on accept/dismiss

### 2. Clinical Cases (`/dashboard/cases`)
**Backend:**
- `GET /api/v1/cases` — list cases assigned to this psychologist
- `GET /api/v1/cases/:id` — case detail (includes student identity after acceptance)
- `PATCH /api/v1/cases/:id/close` — close a case

**Frontend:**
- Case list with student info (code, campus, pseudonym)
- Case detail page with full NLP scores, alert history
- Close case workflow

### 3. Chat (`/chat`)
**Backend:**
- Already partially exists: rooms, messages, Realtime
- `GET /api/v1/chat/rooms` — list active chat rooms for psychologist
- Realtime subscription for new messages

**Frontend:**
- ChatWidget (already exists as component)
- Full chat page with room list and message thread
- Realtime message display via Supabase Realtime or polling

### 4. Forum participation (optional, post-MVP)
- Psychologist can post/comment in forum with a special "Psicólogo" flair
- Requires `participacion_foro_habilitada` check on psychologist profile

### 5. Export (`/dashboard/cases/:id/export`)
**Backend:**
- `POST /api/v1/cases/:id/export` — generate PDF/XML
- Email delivery to psychologist's institutional email

## Key architecture rules for psychologist module

1. **Campus isolation**: Every alert/case query MUST filter by `request.user.campus`. No cross-campus data leaks.
2. **Identity protection**: Student identity (name, code, program) only visible AFTER case acceptance.
3. **Shift-based routing**: HIGH alerts → all psychologists; LOW/MEDIUM → active shift only.
4. **No NLP bypass**: Frontend NEVER calls NLP directly; all analysis via backend proxy.
5. **Realtime**: Use Supabase Realtime for chat. Alerts use polling or Realtime subscription.

## Files expected to be created/modified

### Backend
- `src/modules/alerts/alerts.service.ts`
- `src/modules/alerts/alerts.router.ts`
- `src/modules/alerts/alerts.schema.ts`
- `src/modules/cases/cases.service.ts` (if not exists)
- `src/modules/export/export.service.ts` (if not exists)

### Frontend
- `src/app/(psychologist)/dashboard/page.tsx`
- `src/app/(psychologist)/dashboard/layout.tsx`
- `src/app/(psychologist)/dashboard/cases/page.tsx`
- `src/app/(psychologist)/dashboard/cases/[id]/page.tsx`
- `src/types/domain.ts` — may need `AlertDetail`, `AlertSummary` types (already exist partially)

## Estimated sprint size
- Core dashboard + alerts: 2-3 sessions
- Cases + identity reveal: 1-2 sessions  
- Chat integration: 1 session
- Export: 1 session
