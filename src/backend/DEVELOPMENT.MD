# Backend — MindBridge

## Setup

```bash
cd src/backend
npm install
cp .env.example .env
# Completar variables en .env
npm run dev
```

## Variables de entorno requeridas

Ver `.env.example`. Las críticas:

- `SUPABASE_URL`: URL del proyecto Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: clave service role (nunca al cliente)
- `STUDENT_CODE_ENCRYPTION_KEY`: clave AES-256-GCM (32 bytes en hex)
- `NLP_SERVICE_URL`: URL del microservicio NLP
- `NLP_SERVICE_BEARER_TOKEN`: token de autenticación inter-servicio

## Estado

No inicializado. Pendiente de scaffolding Fastify 5.
