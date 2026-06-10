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

---

## AD-02: Asignación de alias anónimos a casos clínicos para proteger identidad (futuro)

**Fecha:** 2026-06-09
**Contexto:** Los psicólogos atienden múltiples casos clínicos. En las listas de chat y paneles de casos, aparece información del estudiante (nombres reales o pseudónimos del foro) que puede generar sesgo o comprometer la confidencialidad.

**Decisión:** Cuando un caso clínico llega a un psicólogo (sea por aceptación de alerta o auto-referido), el sistema debe asignar un alias anónimo único (ej. "Caso #0024") para identificar al estudiante en todas las interfaces del psicólogo: listas de chat, detalle de caso, paneles de alertas.

**Consecuencias:**

- El alias se genera al aceptar la alerta o crear el caso.
- Se almacena en la tabla `clinical_case` como columna `anonymous_alias`.
- El psicólogo nunca ve el pseudónimo del foro ni el nombre real del estudiante en las listas.
- Solo puede ver datos identificativos (seudónimo, nombre) al entrar al detalle del caso o chat (con permiso explícito).
- Requiere migración de BD: añadir columna `anonymous_alias VARCHAR(20)` a `clinical_case`.

---

## AD-03: Tabla `wellness_event` para eventos de bienestar (futuro)

**Fecha:** 2026-06-09
**Contexto:** Se requiere que el psicólogo pueda crear y modificar tarjetas de "Próximos eventos de bienestar" visibles para los estudiantes en el foro. No existe tabla en la BD actual que persista estos elementos.

**Sugerencia de esquema SQL:**

```sql
CREATE TABLE wellness_event (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(100) NOT NULL,
  description TEXT,
  image_url TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  campus udec_campus,
  created_by UUID NOT NULL REFERENCES psychologist(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Reglas de negocio sugeridas:**

- CRUD exclusivo para rol `PSYCHOLOGIST` (vía RLS).
- Lectura para todos los authenticated del mismo campus.
- `image_url` puede apuntar a Supabase Storage (bucket `wellness-images`).
- El frontend consulta `GET /api/v1/wellness/active?campus={campus}` y muestra las tarjetas en una sección "Próximos eventos" del foro.

---

## AD-04: Sidebar del psicólogo colapsable con protuberancia

**Fecha:** 2026-06-09
**Contexto:** El sidebar del psicólogo en desktop ocupa 224px de ancho constante. En pantallas medianas o cuando el psicólogo necesita más espacio para contenido (especialmente chat y detalle de alertas), el sidebar puede resultar intrusivo.

**Decisión:** El sidebar es colapsable a `w-14` (56px) mediante un botón en forma de protuberancia ubicado en el centro del borde derecho. Al colapsar, solo se muestran iconos centrados; los textos se ocultan con transición suave. La protuberancia se desplaza horizontalmente para alinearse con el nuevo borde.

**Consecuencias:**

- El botón de protuberancia está posicionado con `fixed` y se mueve mediante style `left`.
- El sidebar usa `sticky top-14` en lugar de `fixed` para que participe en el flujo flex y el contenido principal se ajuste automáticamente.
- El layout raíz eliminó `md:pl-56` para delegar el espaciado al flex layout.

---

## AD-05: Deuda técnica — publisher_id polimórfico en post/comment

**Fecha:** 2026-06-09
**Contexto:** La tabla `post` y `comment` tienen una FK obligatoria a `student.id`. Los psicólogos no pueden crear hilos ni comentarios porque no tienen registro en la tabla `student`. Actualmente el problema se resuelve a nivel UI deshabilitando los formularios cuando `participacion_foro_habilitada = false` (default para psicólogos).

**Decisión:** Se posterga la migración de esquema que transformaría `student_id` en un `publisher_id` UUID polimórfico con una columna `publisher_role` (`STUDENT` | `PSYCHOLOGIST`). Mientras tanto, la columna `psychologist.participacion_foro_habilitada` (BOOLEAN, default `false`) controla el acceso desde el frontend.

**Consecuencias:**

- El frontend consulta `/auth/me` para obtener `participacion_foro_habilitada`.
- Si es `false`, se ocultan los formularios de post y comentario, mostrando un banner informativo en tonos lavanda.
- Futura migración: agregar `publisher_id UUID` y `publisher_role VARCHAR` a `post` y `comment`, convertir datos existentes, y eliminar la FK a `student.id` (o hacerla nullable).
- El backend ya almacena y retorna `participacion_foro_habilitada` desde el endpoint `/auth/me`.

---

## AD-06: Endpoint dedicado para consentimiento informado (POST /cases/:caseId/consent)

**Fecha:** 2026-06-09
**Contexto:** El flujo de consentimiento informado FO-BU-O13 es un hito legal independiente del chat transaccional. Aunque el link al formulario se comparte mediante mensajes `CHARACTERIZATION_LINK` en el chat, la constancia de firma debe registrarse como un registro único e inmutable en la tabla `informed_consent_signature`.

**Decisión:** Se implementa un endpoint dedicado `POST /api/v1/cases/:caseId/consent` separado del chat, en lugar de un mensaje especial o Webhook. El psicólogo confirma manualmente desde la UI que el formulario fue completado, y el sistema crea el registro con `form_code = 'FO-BU-O13'`.

**Consecuencias:**

- El registro es único por caso (UNIQUE constraint en `informed_consent_signature.case_id`); un segundo intento devuelve `409 CONFLICT`.
- No hay Webhooks de Google Forms — la confirmación es manual del psicólogo (aunque faltaría investigar por si se puede realizar automático)
- El endpoint valida control multicampus: el campus del estudiante debe coincidir con el del psicólogo autenticado.
- Se agrega `FO_BU_O13_FORM_URL` a la configuración (Zod + env) para que el link sea inyectado dinámicamente en los mensajes `CHARACTERIZATION_LINK`.
- Si en el futuro se necesitan encuestas alternativas (psicosocial, académica), se añadirá un campo `form_code` al body del mensaje para seleccionar la URL desde configuración.
