# Backend — MindBridge

## Setup

```bash
cd src/backend
npm install
cp .env.example .env
# Completar variables en .env (ver abajo)
npm run dev
```

## Variables de entorno requeridas

Ver `.env.example`. Las críticas:

| Variable | Descripción |
|---|---|
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave service_role (nunca al cliente) |
| `SUPABASE_ANON_KEY` | Clave anónima pública |
| `JWT_SECRET` | Secreto JWT de Supabase (mín. 32 caracteres) |
| `STUDENT_CODE_ENCRYPTION_KEY` | Clave AES-256-GCM (32 bytes en hex) |
| `NLP_SERVICE_URL` | URL del microservicio NLP |
| `NLP_SERVICE_BEARER_TOKEN` | Token de autenticación inter-servicio |
| `PORT` | Puerto del servidor (default: 3001) |
| `NODE_ENV` | development | production | test |

## Comandos

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia con hot-reload (tsx watch) |
| `npm run build` | Compila TypeScript a dist/ |
| `npm start` | Inicia desde dist/ en producción |
| `npm run lint` | Ejecuta ESLint |

## Estructura del proyecto

```
src/backend/
├── src/
│   ├── config.ts              # Configuración central tipada
│   ├── server.ts              # Punto de entrada Fastify
│   ├── plugins/
│   │   ├── auth.ts            # JWT verification + request.user
│   │   └── supabase.ts        # Cliente Supabase (service_role)
│   ├── modules/
│   │   ├── auth/              # Registro, login, perfil
│   │   ├── forum/             # Posts y comentarios
│   │   ├── triage/            # Cliente NLP + análisis
│   │   ├── alerts/            # Gestión de alertas
│   │   ├── cases/             # Casos clínicos
│   │   ├── chat/              # Chat psicólogo-estudiante
│   │   ├── export/            # Exportación PDF vía Gmail API
│   │   └── notifications/     # Notificaciones in-app
│   ├── repositories/          # Capa de datos (futuro)
│   ├── types/domain.ts        # Tipos del dominio
│   └── lib/
│       ├── errors.ts          # Errores estandarizados
│       └── encryption.ts      # AES-256-GCM student code
├── tests/                     # Tests de integración
├── package.json
├── tsconfig.json
└── .env.example
```

## Endpoints (base: `/api/v1`)

### Auth
- `POST /auth/register` — Registro de estudiante
- `POST /auth/login` — Inicio de sesión
- `GET /auth/check-pseudonym/:pseudonym` — Verificar disponibilidad
- `GET /auth/me` — Perfil del usuario autenticado
- `POST /auth/logout` — Cerrar sesión
- `PATCH /auth/password-reset` — Reset de contraseña (interno)

## Estado

✅ Inicializado. Módulo Auth implementado.
🚧 Módulos Forum, Alerts, Cases, Chat, Export, Notifications — pendientes.
