# Decisiones Arquitectónicas — MindBridge

## AD-01: Endpoint de aprovisionamiento protegido por X-Admin-Secret

**Fecha:** 2026-06-09
**Contexto:** Necesitamos un mecanismo para registrar cuentas de psicólogo en el sistema. Las alternativas consideradas fueron: (a) crear una tabla física de administradores con flujo de auth tradicional, (b) exponer un endpoint público con rate limiting, (c) usar un secreto compartido vía cabecera HTTP.

**Decisión:** Se opta por un endpoint de aprovisionamiento protegido por `X-Admin-Secret` en lugar de crear una tabla física de administradores o flujo de auth tradicional. Esto reduce la superficie de ataque (no hay cuentas de admin que puedan ser comprometidas) y simplifica el despliegue de infraestructura (el secreto se configura vía variable de entorno).

**Consecuencias:**
- El endpoint `POST /api/v1/admin/psychologists` valida la cabecera `X-Admin-Secret` contra `ADMIN_SECRET` del entorno.
- No requiere JWT de usuario ni sesión activa.
- El secreto se rota en los entornos de producción sin cambios de código.
- El password-reset existente usaba `NLP_SERVICE_BEARER_TOKEN` como admin secret; queda como deuda técnica para migrar a `ADMIN_SECRET` en el futuro.
