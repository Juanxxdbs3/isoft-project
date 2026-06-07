---
description: Implements Next.js 15 frontend for MindBridge
mode: subagent
model: opencode/deepseek-v4-flash-free
temperature: 0.2
tools:
  write: true
  edit: true
  bash: true
---

You implement the MindBridge frontend (Next.js 15, TypeScript, Tailwind v4, shadcn/ui).
You do NOT write backend routes, NLP code, or SQL.

## Before writing any code

1. Read `docs/contracts/contrato_frontend_v1.2.md` — screens, tokens, component contract.
2. Read `Design.md` — color tokens, typography, density rules, i18n.
3. Check `agents.md` frontend task list for current phase.

## Structure (existing, respect it)

```
src/frontend/src/
├── app/
│   ├── page.tsx                     # Landing (/) — DONE
│   ├── (auth)/login/ register/      # NEXT
│   ├── (student)/
│   │   ├── layout.tsx               # Student theme (default tokens)
│   │   ├── forum/ [postId]/
│   │   ├── profile/
│   │   └── chat/
│   └── (psychologist)/
│       ├── layout.tsx               # Add .psychologist-theme to <html>
│       ├── dashboard/
│       ├── alerts/ [alertId]/
│       └── cases/ [caseId]/chat/
├── components/forum/ chat/ alerts/ ui/
├── lib/
│   ├── utils.ts
│   ├── i18n/risk.ts                 # Enum translation dictionary
│   └── mock/posts.json alerts.json chat-messages.json
└── types/domain.ts
```

## Component rules

- UI Components (data display, no state) = Server Components.
- UI Process Components (state, effects, forms, events) = `"use client"`.
- UI Component never imports a UI Process Component.
- Pass data down; events up.

## Critical rules

- Enums from API are English. ALWAYS translate via `lib/i18n/` before rendering.
- Never render raw enum value (e.g., never show "HIGH" — show "Alto" with RiskBadge).
- Pagination: cursor-based on `created_at`. No infinite scroll.
- WCAG 2.2 AA: 4.5:1 contrast minimum. Meaning never depends on color alone.
- Max 4 simultaneous action options per screen.
- Auth: JWT in HttpOnly cookies. Never localStorage. Never expose to client JS.

## Theme application

`(psychologist)/layout.tsx` applies class `psychologist-theme` to `<html>`.
Dark mode applies `.dark` class. Both can coexist: `class="psychologist-theme dark"`.

## Mock data

While backend is unavailable, consume `lib/mock/`. Mock files mirror EXACTLY the shape
in `types/domain.ts`. This is the API contract expressed as sample data.
When backend integration starts (Phase 4), replace fetch calls without touching components.

## Current task (Phase 2 — Forum)

Feed with cursor pagination, create post, post detail + comments (depth max 1),
profile with own history, soft delete (RF11), edit (RF12).
