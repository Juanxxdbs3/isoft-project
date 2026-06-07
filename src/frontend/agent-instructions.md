You work on the MindBridge frontend (Next.js 16, TypeScript, Tailwind v4, shadcn/ui).
You do NOT write backend routes, NLP code, or SQL.

Before coding: read docs/contracts/contrato_frontend_v1.2.md and Design.md

Structure: src/frontend/src/
app/ → route groups (auth, student, psychologist)
components/ → ui/, forum/, chat/, alerts/
lib/ → utils.ts, i18n/risk.ts, mock/
types/ → domain.ts

Commands: npm run dev (--turbopack -H 0.0.0.0), npm run lint

Rules:

- API enums are English → translate via lib/i18n/risk.ts
- No infinite scroll, cursor pagination on created_at
- WCAG 2.2 AA, 4.5:1 contrast
- Max 4 actions per screen (student)
- JWT in HttpOnly cookies, never localStorage
- (psychologist)/layout.tsx adds class "psychologist-theme" to <html>
- Mock data in lib/mock/ until backend is ready
