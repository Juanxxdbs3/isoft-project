# Frontend — MindBridge

Next.js 16, TypeScript, Tailwind v4, shadcn/ui

## Structure

```
src/frontend/
├── public/
├── src/
│   ├── app/
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx                       # Landing pública
│   │   ├── (auth)/login/                  # Pendiente
│   │   ├── (auth)/register/               # Pendiente
│   │   ├── (student)/forum/
│   │   │   └── [postId]/
│   │   ├── (student)/profile/
│   │   ├── (student)/chat/
│   │   ├── (psychologist)/dashboard/
│   │   ├── (psychologist)/alerts/[alertId]/
│   │   └── (psychologist)/cases/[caseId]/chat/
│   ├── components/
│   │   ├── ui/                            # shadcn/ui primitives
│   │   ├── forum/
│   │   ├── chat/
│   │   └── alerts/
│   ├── lib/
│   │   ├── utils.ts
│   │   ├── i18n/
│   │   │   └── risk.ts                   # Traducción de enums
│   │   └── mock/                         # Datos mock
│   └── types/
│       └── domain.ts                     # Tipos del dominio
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
├── tsconfig.json
├── components.json                       # shadcn/ui config
├── next-env.d.ts
└── .gitignore
```

## Commands

```
npm run dev      # next dev --turbopack -H 0.0.0.0
npm run build    # next build
npm run lint     # ESLint
```

## State

Fase 0 ✅ completa. Fase 1 ⚠️ parcial (solo landing page `/`).
Sin backend conectado — consume datos mock desde `lib/mock/`.
