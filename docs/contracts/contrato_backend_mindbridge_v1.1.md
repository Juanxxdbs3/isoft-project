# Contrato Backend API — MindBridge
## Diseño del servicio Fastify: endpoints, contratos JSON y reglas de negocio

---

## Historial de versiones

| Versión | Fecha | Descripción |
|---|---|---|
| 1.0 | 02-06-2026 | Primera versión: endpoints completos, contratos JSON, flujo NLP asíncrono, autenticación JWT vía Supabase, convenciones de error. |
| 1.1 | 04-06-2026 | Estandarización de enums a inglés (LOW/MEDIUM/HIGH, PENDING/ACCEPTED/SERVED/FALSE_POSITIVE/COMPLEMENTARY). Campus actualizado a lista completa de sedes UdeC. POST /cases reemplaza POST /cases/self-referral. GET /cases y GET /auth/check-pseudonym agregados. Regla de turno activo documentada. assignCaseToPsychologist retorna Case. Consumo del esquema NLP v6 en sección 14. |

---

## 1. Propósito

Este documento define el contrato del servicio backend de MindBridge, implementado en Fastify con TypeScript. Especifica todos los endpoints expuestos, sus esquemas de entrada y salida, las reglas de negocio que gobiernan cada operación, el flujo de integración con el microservicio NLP y las restricciones no funcionales del servicio.

El backend es el único componente que escribe y lee de la base de datos PostgreSQL (Supabase). El frontend Next.js consume este servicio exclusivamente a través de HTTP REST. El microservicio NLP es invocado de forma interna por el backend; el frontend nunca llama al NLP directamente.

---

## 2. Principios de diseño

**Una responsabilidad por endpoint.** Cada endpoint ejecuta una sola operación de negocio.

**El backend no confía en el cliente.** Todo dato sensible (campus, rol, identidad real) se extrae del JWT verificado, no del cuerpo de la solicitud.

**El NLP es un colaborador asíncrono, no un bloqueante.** La respuesta `201` se envía de inmediato. La llamada al microservicio NLP se ejecuta en paralelo. Si falla, el contenido sigue visible y se reencola.

**Las operaciones clínicas son irreversibles.** Los registros de `nlp_analysis`, `registration_consent` y `export_case` nunca se actualizan ni eliminan. Se usa soft delete para publicaciones y cuentas.

**La sede del estudiante es el límite de visibilidad del psicólogo.** Ningún endpoint del psicólogo devuelve datos de estudiantes de otra sede.

---

## 3. Stack y configuración

| Componente | Tecnología |
|---|---|
| Runtime | Node.js 22, TypeScript |
| Framework HTTP | Fastify 5 |
| Validación de esquemas | JSON Schema (Fastify nativo) + Zod para lógica de negocio |
| ORM / cliente DB | Supabase JS Client v2 |
| Autenticación | Supabase Auth — verificación JWT en preHandler |
| Zona horaria | America/Bogota (UTC-5) para cálculo de turno activo |
| Envío de correo | Gmail API v1 vía GoogleAuth (OAuth2 service account) |
| PDF | `pdf-lib` |
| Variables de entorno | Módulo central `src/config.ts` |

Prefijo base de todos los endpoints: `/api/v1`

---

## 4. Autenticación y autorización

### 4.1 Mecanismo

Supabase Auth emite JWTs firmados con RS256. El frontend los almacena en cookies `HttpOnly` gestionadas por el BFF Next.js y los envía en el header `Authorization: Bearer <token>`.

El backend verifica cada token en un `preHandler` global. Si es inválido o expirado, responde `401` antes de ejecutar cualquier lógica.

### 4.2 Payload del JWT

```typescript
interface JwtPayload {
  sub: string;
  role: 'student' | 'psychologist';
  campus: UdecCampus;   // identificador del enum udec_campus del SQL
  iat: number;
  exp: number;
}

type UdecCampus =
  | 'CLAUSTRO_SAN_AGUSTIN'
  | 'ZARAGOCILLA'
  | 'PIEDRA_BOLIVAR'
  | 'CLAUSTRO_LA_MERCED'
  | 'CLAUSTRO_SANTO_DOMINGO'
  | 'EL_CARMEN_DE_BOLIVAR'
  | 'MAGANGUE'
  | 'SAN_JUAN_NEPOMUCENO'
  | 'SANTA_CRUZ_DE_MOMPOS'
  | 'CERETE'
  | 'LORICA';
```

### 4.3 Decoradores de Fastify

```typescript
request.user.id       // UUID del usuario autenticado
request.user.role     // 'student' | 'psychologist'
request.user.campus   // UdecCampus
```

### 4.4 Regla de turno activo

El cálculo de turno activo se realiza en `NotificationService` sobre la hora del servidor en `America/Bogota` (UTC-5):

- `SHIFT_1`: 07:00–14:59:59 → notificaciones a psicólogos con `shift = 'SHIFT_1'`
- `SHIFT_2`: 15:00–21:59:59 → notificaciones a psicólogos con `shift = 'SHIFT_2'`
- Fuera de rango: alertas `LOW` y `MEDIUM` se encolan hasta el inicio del siguiente turno; alertas `HIGH` se envían a todos los psicólogos de la sede sin importar turno.

### 4.5 Tabla de acceso por endpoint

| Módulo | Rol requerido |
|---|---|
| Auth (register, login, check-pseudonym) | Público |
| Forum — leer | `student` |
| Forum — crear, editar, eliminar | `student` (solo propias) |
| Alerts — leer, aceptar, gestionar | `psychologist` |
| Cases — ver, exportar, gestionar | `psychologist` |
| Cases — self-referral | `student` |
| Chat — iniciar | `psychologist` |
| Chat — responder | `student` o `psychologist` (solo chat activo propio) |
| Notifications | `student` o `psychologist` |
| Psychologist settings | `psychologist` |

---

## 5. Convenciones de respuesta

### 5.1 Respuesta exitosa

```json
{ "data": { }, "meta": { } }
```

`meta` es opcional. Se usa en respuestas paginadas para incluir el cursor.

### 5.2 Respuesta de error

```json
{
  "error": "SCREAMING_SNAKE_CASE_CODE",
  "message": "Descripción legible en español.",
  "statusCode": 409
}
```

### 5.3 Códigos HTTP

| Código | Uso |
|---|---|
| 200 | Éxito con cuerpo |
| 201 | Recurso creado |
| 202 | Procesamiento asíncrono iniciado (exportación PDF) |
| 204 | Éxito sin cuerpo |
| 400 | Violación de regla de negocio |
| 401 | No autenticado |
| 403 | Rol o campus incorrecto |
| 404 | Recurso no encontrado |
| 409 | Conflicto (duplicado, estado incorrecto) |
| 422 | Validación de esquema fallida |
| 503 | Microservicio NLP no disponible (el post se crea igualmente) |

---

## 6. Módulo Auth

### GET /auth/check-pseudonym
**Rol:** Público | **RF:** RF01

Verifica en tiempo real si un pseudónimo está disponible. Se llama desde el formulario de registro mientras el usuario escribe (validación progresiva).

**Query params:** `value: string`

**Respuesta 200:**
```json
{ "data": { "available": true } }
```

**Regla:** el pseudónimo no puede coincidir con el nombre real ni con el código estudiantil en texto plano. Esta validación la aplica la capa de aplicación antes de consultar la BD.

---

### POST /auth/register
**Rol:** Público | **RF:** RF01, RF02

Crea la cuenta del estudiante. La aceptación de términos debe recibirse en el mismo request.

**Request body:**
```json
{
  "pseudonym": "string (3–30 chars; vacío → generación automática)",
  "password": "string (mín. 8 chars)",
  "student_code": "string (se encripta con AES-256-GCM antes de persistir)",
  "campus": "CLAUSTRO_SAN_AGUSTIN | ZARAGOCILLA | PIEDRA_BOLIVAR | CLAUSTRO_LA_MERCED | CLAUSTRO_SANTO_DOMINGO | EL_CARMEN_DE_BOLIVAR | MAGANGUE | SAN_JUAN_NEPOMUCENO | SANTA_CRUZ_DE_MOMPOS | CERETE | LORICA",
  "accepted_terms": true,
  "terms_version": "string",
  "age_declaration": true
}
```

**Respuesta 201:**
```json
{
  "data": {
    "student_id": "uuid",
    "pseudonym": "string",
    "campus": "string"
  }
}
```

**Errores:** `409 PSEUDONYM_ALREADY_TAKEN`, `409 STUDENT_CODE_ALREADY_REGISTERED`, `400 TERMS_NOT_ACCEPTED`, `400 AGE_DECLARATION_REQUIRED`

**Reglas de negocio:**
- Generar pseudónimo automático si el campo llega vacío.
- Encriptar `student_code` con AES-256-GCM. La clave vive en `STUDENT_CODE_ENCRYPTION_KEY` del módulo de configuración.
- Persistir `registration_consent` de forma atómica con `student` en una transacción.
- Asignar rol `student` y `campus` en `app_metadata` de Supabase Auth.

---

### POST /auth/login
**Rol:** Público

**Request body:**
```json
{
  "identifier": "string (pseudónimo para estudiante, correo para psicólogo)",
  "password": "string",
  "role": "student | psychologist"
}
```

**Respuesta 200:**
```json
{
  "data": {
    "access_token": "string",
    "refresh_token": "string",
    "role": "student | psychologist",
    "campus": "string"
  }
}
```

**Errores:** `401 INVALID_CREDENTIALS`, `403 ACCOUNT_SUSPENDED`

---

### POST /auth/logout
**Rol:** `student` | `psychologist`

Invalida el refresh token. Responde `204`.

---

### PATCH /auth/password-reset
**Rol:** Interno — solo accesible con header `X-Admin-Reset-Secret` | **L-11**

Reset offline de contraseña de estudiante sin correo. No es flujo de autoservicio.

**Request body:** `{ "student_id": "uuid", "new_password_plain": "string" }`

**Respuesta 200:** `{ "data": { "reset": true } }`

---

## 7. Módulo Forum

### GET /forum/posts
**Rol:** `student` | **RF:** RF07

Feed con paginación por cursor. No devuelve posts `DELETED` ni `MODERATED`.

**Query params:** `cursor?: string (ISO timestamp)`, `limit?: number (default 20, max 50)`

**Respuesta 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "pseudonym": "string",
      "text_content": "string",
      "comment_count": 0,
      "created_at": "ISO8601",
      "is_own": true
    }
  ],
  "meta": { "next_cursor": "ISO8601 | null" }
}
```

---

### POST /forum/posts
**Rol:** `student` | **RF:** RF07, RF13

Crea el post y dispara el pipeline NLP en background. Responde `201` de inmediato.

**Request body:** `{ "text_content": "string (1–4000 chars)" }`

**Respuesta 201:**
```json
{
  "data": {
    "id": "uuid",
    "pseudonym": "string",
    "text_content": "string",
    "created_at": "ISO8601"
  }
}
```

**Flujo interno post-creación (asíncrono):**
```
1. Guardar Post con status = 'VISIBLE'
2. Llamar NLP POST /api/v1/analyze (timeout: 5s)
   a. Éxito → guardar NLPAnalysis (con analyzed_text_snapshot = text_content)
      Si risk_level > 'LOW':
        - Crear/actualizar ClinicalCase
        - Crear Alert (is_complementary según student.caso_formal_activo)
        - NotificationService.notifyPsychologists(campus, riskLevel, alertId)
   b. Timeout / error → encolar (reintentos x3 con backoff exponencial)
      Post sigue visible. Evento registrado en log.
```

---

### GET /forum/posts/:postId
**Rol:** `student` | **RF:** RF08

**Respuesta 200:**
```json
{
  "data": {
    "id": "uuid",
    "pseudonym": "string",
    "text_content": "string",
    "created_at": "ISO8601",
    "is_own": true,
    "comments": [
      {
        "id": "uuid",
        "pseudonym": "string",
        "text_content": "string",
        "cited_comment_id": "uuid | null",
        "created_at": "ISO8601",
        "is_own": false
      }
    ]
  }
}
```

---

### PATCH /forum/posts/:postId
**Rol:** `student` (solo propias) | **RF:** RF12

Edita el texto. Genera un nuevo ciclo NLP independiente. El análisis original no se modifica; `analyzed_text_snapshot` del registro original preserva el texto de la primera versión.

**Request body:** `{ "text_content": "string" }`

**Respuesta 200:** misma forma que `POST /forum/posts`.

**Errores:** `403 NOT_POST_OWNER`, `404 POST_NOT_FOUND`

---

### DELETE /forum/posts/:postId
**Rol:** `student` (solo propias) | **RF:** RF11

Soft delete: actualiza `status = 'DELETED'`. Si la alerta derivada es `MEDIUM` o `HIGH`, el texto se conserva en BD. Si es `LOW`, la alerta y el `nlp_analysis` asociados se eliminan en cascada.

**Respuesta 204.**

**Errores:** `403 NOT_POST_OWNER`, `404 POST_NOT_FOUND`

---

### POST /forum/posts/:postId/comments
**Rol:** `student` | **RF:** RF08, RF13

Mismo flujo NLP asíncrono que `POST /forum/posts`.

**Request body:**
```json
{
  "text_content": "string",
  "cited_comment_id": "uuid | null"
}
```

**Respuesta 201:** misma forma que `POST /forum/posts` con `cited_comment_id`.

**Regla:** `cited_comment_id` debe pertenecer al mismo `postId` (`400 INVALID_CITED_COMMENT`).

---

### PATCH /forum/comments/:commentId
**Rol:** `student` (solo propias) | **RF:** RF12

Igual que `PATCH /forum/posts`. Genera nuevo ciclo NLP.

---

### DELETE /forum/comments/:commentId
**Rol:** `student` (solo propias) | **RF:** RF11

Mismo comportamiento que `DELETE /forum/posts` sobre la entidad `comment`.

---

## 8. Módulo Alerts

### GET /alerts
**Rol:** `psychologist` | **RF:** RF15, RF16

Alertas del campus del psicólogo autenticado, ordenadas por nivel de riesgo (`HIGH` primero) y `generated_at`.

**Query params:**
```
status?: 'PENDING' | 'ACCEPTED' | 'SERVED' | 'FALSE_POSITIVE' | 'COMPLEMENTARY'
risk_level?: 'LOW' | 'MEDIUM' | 'HIGH'
limit?: number (default 30)
cursor?: string
```

**Respuesta 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "pseudonym": "string",
      "risk_level": "HIGH",
      "status": "PENDING",
      "is_complementary": false,
      "trigger_text": "string",
      "generated_at": "ISO8601",
      "campus": "string"
    }
  ],
  "meta": { "next_cursor": "string | null" }
}
```

**Regla:** nunca expone nombre real, código estudiantil ni `student_id` en texto plano. Solo el pseudónimo activo.

---

### GET /alerts/:alertId
**Rol:** `psychologist` (campus propio) | **RF:** RF14, RF21

Si el psicólogo autenticado es el `assigned_psychologist_id`, la respuesta incluye `deanonymized_data`. Si la alerta está `PENDING`, ese campo es `null`.

**Respuesta 200:**
```json
{
  "data": {
    "id": "uuid",
    "risk_level": "HIGH",
    "status": "ACCEPTED",
    "is_complementary": false,
    "pseudonym": "string",
    "trigger_text": "string",
    "generated_at": "ISO8601",
    "nlp_scores": {
      "depression": 78.0,
      "anxiety": 82.0,
      "suicidal": 65.0,
      "imb": 79.6,
      "suicidal_override": true,
      "risk_level": "HIGH",
      "rationale": "string"
    },
    "deanonymized_data": {
      "student_code": "string",
      "campus": "string",
      "full_name": "string | null",
      "email": "string | null",
      "program": "string | null",
      "semester": "number | null"
    },
    "post_history": [
      {
        "id": "uuid",
        "text_content": "string",
        "created_at": "ISO8601",
        "risk_level": "MEDIUM | null"
      }
    ],
    "previous_alerts": []
  }
}
```

**Errores:** `403 CAMPUS_MISMATCH`, `403 ALERT_ASSIGNED_TO_ANOTHER`, `404 ALERT_NOT_FOUND`

---

### POST /alerts/:alertId/accept
**Rol:** `psychologist` (campus propio) | **RF:** RF19, RF21

Acepta formalmente el caso. Cambia `alert.status = 'ACCEPTED'`, asigna `assigned_psychologist_id`, cambia `clinical_case.status = 'ASSIGNED'`. Operación atómica con control optimista de concurrencia.

**Respuesta 200:**
```json
{
  "data": {
    "alert_id": "uuid",
    "case": {
      "id": "uuid",
      "status": "ASSIGNED",
      "case_type": "AUTOMATIC_ALERT",
      "assigned_psychologist_id": "uuid",
      "opened_at": "ISO8601"
    },
    "accepted_at": "ISO8601"
  }
}
```

**Errores:** `409 ALERT_ALREADY_ACCEPTED`

**Nota:** la respuesta incluye el objeto `case` completo porque `assignCaseToPsychologist` retorna `Case`. El caller (WorkflowAtencion) no necesita hacer una segunda consulta para obtener el estado actualizado.

---

### PATCH /alerts/:alertId/status
**Rol:** `psychologist` asignado | **RF:** RF24

**Request body:** `{ "status": "SERVED | FALSE_POSITIVE" }`

**Respuesta 200:** `{ "data": { "alert_id": "uuid", "new_status": "string" } }`

**Regla:** `FALSE_POSITIVE` registra el evento en el historial del caso para retroalimentación del modelo NLP.

---

## 9. Módulo Cases

### GET /cases
**Rol:** `psychologist` | **RF:** RF16 (SELF\_REFERRAL)

Lista casos del campus del psicólogo. Sin filtro devuelve todos; con `case_type` filtra por tipo.

**Query params:**
```
case_type?: 'AUTOMATIC_ALERT' | 'SELF_REFERRAL'
status?: 'OPENED' | 'ASSIGNED' | 'ARCHIVED' | 'RESOLVED'
limit?: number (default 20)
cursor?: string
```

**Respuesta 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "case_type": "SELF_REFERRAL",
      "status": "OPENED",
      "opened_at": "ISO8601",
      "pseudonym": "string"
    }
  ],
  "meta": { "next_cursor": "string | null" }
}
```

---

### GET /cases/:caseId
**Rol:** `psychologist` asignado | **RF:** RF14

**Respuesta 200:**
```json
{
  "data": {
    "id": "uuid",
    "status": "ASSIGNED",
    "case_type": "AUTOMATIC_ALERT | SELF_REFERRAL",
    "opened_at": "ISO8601",
    "is_unsubscribed_from_recapture": false,
    "adviser_export_status": "NOT_EXPORTED",
    "student": {
      "pseudonym": "string",
      "campus": "string"
    },
    "chat_room": {
      "id": "uuid | null",
      "status": "ACTIVE | ARCHIVED | null"
    }
  }
}
```

---

### POST /cases
**Rol:** `student` | **RF:** RF16

El estudiante solicita apoyo directamente. Crea un `clinical_case` con `case_type = 'SELF_REFERRAL'`, sin `nlp_analysis` ni alerta asociada.

**Request body:** `{ "case_type": "SELF_REFERRAL" }`

**Respuesta 201:** `{ "data": { "case_id": "uuid", "opened_at": "ISO8601" } }`

**Errores:** `409 ACTIVE_SELF_REFERRAL_EXISTS`

**Regla:** un estudiante no puede tener dos casos `SELF_REFERRAL` activos simultáneamente.

---

### PATCH /cases/:caseId/formal-active
**Rol:** `psychologist` asignado | **RF:** RF17

Marca `student.caso_formal_activo = true`. Las nuevas alertas del estudiante se crean con `is_complementary = true`.

**Respuesta 200:** `{ "data": { "case_id": "uuid", "formal_active": true } }`

**Regla:** irreversible desde la interfaz. Solo reversible por intervención técnica directa sobre la BD.

---

## 10. Módulo Chat

### POST /cases/:caseId/chat
**Rol:** `psychologist` asignado | **RF:** RF23

Crea el `chat_room`. Solo puede existir un chat activo por caso.

**Respuesta 201:**
```json
{ "data": { "chat_id": "uuid", "case_id": "uuid", "opened_at": "ISO8601" } }
```

**Errores:** `400 CASE_NOT_ASSIGNED`, `409 CHAT_ALREADY_EXISTS`

**Nota:** tras la creación, el frontend suscribe al canal Supabase Realtime `chat_room:{chat_id}` para mensajes en tiempo real. El backend no implementa WebSocket propio.

---

### GET /cases/:caseId/chat
**Rol:** `psychologist` asignado o `student` receptor | **RF:** RF23

**Query params:** `cursor?: string`, `limit?: number (default 50)`

**Respuesta 200:**
```json
{
  "data": {
    "chat_id": "uuid",
    "status": "ACTIVE",
    "messages": [
      {
        "id": "uuid",
        "sender_role": "PSYCHOLOGIST | STUDENT",
        "text_content": "string",
        "type": "STANDARD_TEXT | APPOINTMENT_PROPOSAL | CHARACTERIZATION_LINK",
        "sent_at": "ISO8601",
        "read": false
      }
    ]
  },
  "meta": { "next_cursor": "string | null" }
}
```

---

### POST /cases/:caseId/chat/messages
**Rol:** `psychologist` asignado o `student` receptor | **RF:** RF23, RF24

**Request body:**
```json
{
  "text_content": "string",
  "type": "STANDARD_TEXT | APPOINTMENT_PROPOSAL | CHARACTERIZATION_LINK"
}
```

**Respuesta 201:** mensaje creado con `id` y `sent_at`.

**Reglas:**
- `CHARACTERIZATION_LINK`: el `text_content` es ignorado; el backend inyecta la URL configurada del formulario FO-BU-O13.
- `APPOINTMENT_PROPOSAL`: puede incluir `appointment_data: { proposed_dates: string[] }` para el subflow de Google Calendar (RF03).
- El estudiante solo puede enviar `STANDARD_TEXT`.
- El estudiante sin chat activo recibe `403 NO_ACTIVE_CHAT`.

---

### PATCH /cases/:caseId/chat
**Rol:** `psychologist` asignado | **RF:** RF24

**Request body:** `{ "status": "ARCHIVED" }`

**Respuesta 200:** `{ "data": { "chat_id": "uuid", "new_status": "ARCHIVED" } }`

---

## 11. Módulo Export

### POST /cases/:caseId/export
**Rol:** `psychologist` asignado | **RF:** RF04

**Precondición:** debe existir un `chat_room` iniciado (`400 CHAT_REQUIRED_BEFORE_EXPORT`).

**Request body:** `{ "confirm": true }`

**Respuesta 202:**
```json
{
  "data": {
    "export_id": "uuid",
    "recipient_email": "string",
    "queued_at": "ISO8601"
  }
}
```

**Flujo interno:**
```
1. Compilar campos del caso (ver ER_3 IEX-02)
2. Generar PDF con pdf-lib
3. Enviar vía Gmail API
4. Si falla → reintento x3 → ofrecer URL firmada en Supabase Storage
5. Registrar ExportCase con EXPORTED_SUCCESS o FAILED
```

---

## 12. Módulo Notifications

### GET /notifications
**Rol:** `student` | `psychologist`

**Respuesta 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "message": "string",
      "risk_level": "HIGH | null",
      "related_entity_id": "uuid | null",
      "created_at": "ISO8601",
      "read": false
    }
  ]
}
```

---

### PATCH /notifications/:notificationId/read
**Rol:** `student` | `psychologist`

Responde `204`.

---

## 13. Módulo Psychologist Settings

### PATCH /psychologists/me/forum-participation
**Rol:** `psychologist` | **RF:** RF06

**Request body:** `{ "enabled": true | false }`

**Respuesta 200:** `{ "data": { "forum_participation_enabled": true } }`

---

### PATCH /psychologists/me/email-alerts
**Rol:** `psychologist`

**Request body:** `{ "enabled": true | false }`

**Respuesta 200:** `{ "data": { "email_alerts_enabled": true } }`

---

## 14. Integración con el microservicio NLP

El backend llama al NLP tras cada `POST /forum/posts` y `POST /forum/posts/:id/comments`. Esta llamada no bloquea la respuesta al estudiante.

### Esquema de llamada (interno)

```typescript
const nlpPayload = {
  id_publicacion: post.id,
  id_seudonimo:   hashedPseudonym,
  texto:          post.text_content,
  timestamp:      post.created_at,
  contexto_previo: buildContext(studentId),  // últimas 5 publicaciones
  incluir_explicabilidad: false
};

const result = await nlpClient.analyze(nlpPayload);  // timeout: 5000ms
```

### Esquema de respuesta esperado (NLP v6)

```typescript
interface NLPResponse {
  id_publicacion: string;
  status: 'success' | 'error';
  timestamp_analisis: string;
  execution_time_ms: number;
  texto_suficiente: boolean;
  safety_filter_triggered: boolean;
  confianza_reducida: boolean;
  advertencias: string[];
  clinical: {
    p_depresion:     number;       // 0–100
    p_ansiedad:      number;
    p_suicida:       number;
    imb:             number;
    suicidal_override: boolean;
    risk_level:      'LOW' | 'MEDIUM' | 'HIGH' | 'SAFETY_FILTER_TRIGGERED';
    top_clinical_label: string;
    rationale:       string;
  } | null;
  community: {
    cumple_normas:     boolean;
    score_normas:      number;     // 0–1
    moderation_decision: 'APPROVED' | 'REJECTED';
  } | null;
  metadatos: {
    tokens_procesados:            number;
    publicaciones_contexto_usadas: number;
    version_modelo_clinico:       string;
    version_modelo_normas:        string;
  };
  explicabilidad: object | null;
}
```

### Procesamiento del resultado

```
Si result.status === 'error':
  → Log del fallo
  → Encolar en nlp_retry_queue (id_publicacion, intentos, próximo_intento)
  → Cron reintenta cada 2 minutos, máximo 3 intentos

Si result.safety_filter_triggered === true:
  → Flujo prioritario: risk_level = 'HIGH', sin esperar cola

Si result.clinical.risk_level ∈ ['LOW','MEDIUM','HIGH','SAFETY_FILTER_TRIGGERED']:
  → INSERT nlp_analysis (analyzed_text_snapshot = post.text_content)
  → Si risk_level !== 'LOW':
      → CREATE/GET clinical_case
      → INSERT alert (is_complementary según student.caso_formal_activo)
      → NotificationService.dispatch(campus, riskLevel, alertId)

Si result.community.cumple_normas === false:
  → Actualizar post/comment status a 'MODERATED'
  → Notificar al autor (in_app)
```

### Notificaciones tras alerta generada

```
risk_level LOW / MEDIUM:
  → in_app_notification a psicólogos del campus en turno activo

risk_level HIGH:
  → in_app_notification a TODOS los psicólogos del campus
  → Gmail API a psicólogos con email_alerts_subscribed = true del campus
```

---

## 15. Restricciones no funcionales

| Restricción | Valor | Referencia |
|---|---|---|
| Tiempo de respuesta endpoints públicos | < 200ms (p95) | RDes-09 |
| Timeout llamada NLP | 5000ms | RDes-08 |
| Usuarios concurrentes | 200–300 | RDes-02 |
| Disponibilidad | ≥ 99.5% | RDes-13 |
| Recuperación ante fallo NLP | < 5 minutos | RDes-14 |
| Cifrado código estudiantil | AES-256-GCM | RD-03 |
| JWT verificado en cada request | RS256 vía Supabase | RD-06 |
| DB writes críticos (consent, nlp_analysis) | Transaccionales (ACID) | RD-08 |
| Variables de configuración | Módulo central `src/config.ts` | Instrucciones proyecto |

---

## 16. Estructura de carpetas del servicio

```
src/backend/
├── src/
│   ├── config.ts
│   ├── server.ts
│   ├── plugins/
│   │   ├── auth.ts
│   │   └── supabase.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.router.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.schema.ts
│   │   ├── forum/
│   │   │   ├── forum.router.ts
│   │   │   ├── forum.service.ts
│   │   │   └── forum.schema.ts
│   │   ├── triage/
│   │   │   ├── triage.service.ts
│   │   │   └── nlp.client.ts
│   │   ├── alerts/
│   │   ├── cases/
│   │   ├── chat/
│   │   ├── export/
│   │   └── notifications/
│   ├── repositories/
│   │   ├── post.repository.ts
│   │   ├── comment.repository.ts
│   │   ├── alert.repository.ts
│   │   ├── case.repository.ts
│   │   ├── chat.repository.ts
│   │   └── export.repository.ts
│   └── types/
│       └── domain.ts
├── package.json
└── .env.example
```

---

## 17. Pendientes formalizados

La viabilidad técnica de la integración con Google Calendar (RF03, D-33) queda pendiente de confirmación antes de implementar el subflow `APPOINTMENT_PROPOSAL` en el módulo de chat.

El cron de recaptura de chats inactivos (RF20) y el cron de reintentos NLP se implementan como tareas programadas (`fastify-cron`) o scripts externos; su especificación detallada queda para la fase de implementación.

Las políticas RLS de Supabase deben configurarse en Supabase Studio antes de pasar a producción.
