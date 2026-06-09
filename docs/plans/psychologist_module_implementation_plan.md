# Plan de Implementación — Módulo del Psicólogo
## MindBridge · Fase de Construcción · Iteración Psicólogo

> **Para OpenCode.** Leer este documento completo antes de escribir una sola línea de código.
> Documentos de referencia obligatoria antes de actuar:
> - `docs/diagrams/persistence-and-infraestructure.txt`
> - `docs/diagrams/attention-alerts-module.txt`
> - `docs/diagrams/presentacion-e-interfaz.txt`
> - `docs/diagrams/triage-forum-module.txt`
> - `docs/diagrams/types.txt`
> - `docs/models/MindBridge_entity_reference.md`
> - `docs/contracts/contrato_backend_mindbridge_v1.1.md`
> - `docs/contracts/contrato_frontend_mindbridge_v1.2.md`

---

## 0. Estado de partida y diagnóstico

### Lo que existe
- `src/backend/src/repositories/` — carpeta creada, **vacía**. Es la carpeta correcta pero sin contenido.
- `src/backend/src/modules/alerts/` — **vacío**
- `src/backend/src/modules/cases/` — **vacío**
- `src/backend/src/modules/notifications/` — **vacío**
- `src/backend/src/modules/triage/` — **vacío**
- `src/backend/src/modules/export/` — **vacío**
- `src/frontend/src/app/(psychologist)/` — layout creado, solo una pantalla de dashboard stub
- `src/frontend/src/app/globals.css` — tokens de color del psicólogo ya definidos bajo `.psychologist-theme`

### El problema arquitectónico central
Los servicios existentes (`forum.service.ts`, `auth.service.ts`) llaman directamente al cliente de Supabase desde la lógica de negocio. Esto viola el principio de inversión de dependencias (DIP) y hace que el diseño de la capa de repositorios que aparece en `persistence-and-infraestructure.txt` no se cumpla.

**La regla para este plan:** cada nuevo módulo del psicólogo debe crear su repositorio antes de crear el servicio. Los servicios NUNCA llaman a `supabaseClient` directamente; siempre pasan por la interfaz del repositorio.

> **No refactorizar los módulos del estudiante en esta sesión.** Solo aplicar el patrón correcto en todo código nuevo que se cree.

---

## 1. Sesión 1 — Fundación: registro de psicólogos y tema visual

### Objetivo
Poder registrar cuentas de psicólogo desde una pantalla mínima de administración y aplicar el tema de colores del psicólogo a su layout. Sin esto el resto del módulo no se puede probar end-to-end.

### 1.1 Backend — endpoint de aprovisionamiento de psicólogo

**Ruta:** `POST /api/v1/admin/psychologists`

Este endpoint solo es accesible con un secreto de cabecera (`X-Admin-Secret`). No usa JWT de usuario. En producción este secreto se configura en `.env`. Su propósito es el mismo que el reset de contraseña de L-11: operación técnica de despliegue, no flujo de autoservicio.

**Archivos a crear:**
```
src/backend/src/repositories/
  interfaces.ts            ← todas las interfaces de repositorio en un solo archivo
  psychologist.repository.ts

src/backend/src/modules/psychologists/
  psychologists.router.ts
  psychologists.service.ts
  psychologists.schema.ts
```

**Contrato del repositorio de psicólogo** (extraído de `persistence-and-infraestructure.txt` y `attention-alerts-module.txt`):
```typescript
// En repositories/interfaces.ts — agregar gradualmente
export interface IPsychologistRepository {
  findById(id: string): Promise<Psychologist | null>;
  findByCampus(campus: UdecCampus): Promise<Psychologist[]>;
  findByCampusAndShift(campus: UdecCampus, shift: ShiftType): Promise<Psychologist[]>;
}
```

**Implementación** en `psychologist.repository.ts`:
```typescript
export class SupabasePsychologistRepository implements IPsychologistRepository {
  constructor(private readonly client: SupabaseClient) {}
  // implementar los tres métodos
}
```

**Lógica del servicio de aprovisionamiento:**
1. Validar el secreto de admin desde la cabecera.
2. Crear usuario en `auth.users` vía Supabase Admin con `app_metadata = { role: 'psychologist', campus }`.
3. Insertar fila en tabla `psychologist` con los campos de `psychologists.schema.ts`.
4. El `id` de `psychologist` es el mismo `UUID` que emite Supabase Auth (`auth.uid()`), exactamente como se hace con el estudiante.

**Request body:**
```json
{
  "nombre": "string",
  "correo_institucional": "string",
  "campus": "PIEDRA_BOLIVAR",
  "shift": "SHIFT_1",
  "password": "string (mínimo 8 chars)"
}
```

**Respuesta 201:**
```json
{ "data": { "psychologist_id": "uuid", "campus": "string" } }
```

**Reglas:**
- El `correo_institucional` debe ser único (la tabla tiene UNIQUE constraint).
- El password se pasa a Supabase Auth; nunca se persiste en la tabla `psychologist`.
- El `pseudonimo_institucional` se asigna por defecto a `"Equipo de Bienestar Universitario"`.
- `participacion_foro_habilitada = false` siempre al crear (RF06).
- `email_alerts_subscribed = true` siempre al crear.

---

### 1.2 Frontend — pantalla de registro de psicólogo (admin mínimo)

**Ruta:** `/admin/register-psychologist`

Esta ruta no pertenece al route group `(psychologist)` ni al `(student)`. Es una ruta plana en `src/app/admin/register-psychologist/page.tsx`. No requiere autenticación JWT de usuario; el form envía el `X-Admin-Secret` del lado del cliente (hardcodeado en `.env.local` como `NEXT_PUBLIC_ADMIN_SECRET`).

> **Advertencia para OpenCode:** esta pantalla es una herramienta de despliegue interno, no una pantalla de producto. No aplicarle el sistema de diseño completo. Un formulario funcional con los campos necesarios es suficiente.

**Campos del formulario:**
- Nombre completo
- Correo institucional
- Campus (selector con los 11 valores del enum `UdecCampus`, usando las etiquetas en español del i18n)
- Turno (SHIFT_1 / SHIFT_2 con etiquetas "07:00–15:00" / "15:00–22:00")
- Contraseña

**Archivo:** `src/frontend/src/app/admin/register-psychologist/page.tsx`

No crear layout separado para `/admin`. Un solo archivo de página es suficiente.

---

### 1.3 Frontend — aplicar tema de psicólogo al layout

**Archivo a modificar:** `src/frontend/src/app/(psychologist)/layout.tsx`

El tema del psicólogo ya está definido en `globals.css` bajo `.psychologist-theme`. Para activarlo basta con agregar esa clase al elemento `<html>` o al contenedor raíz del layout.

La forma correcta en Next.js 15 (sin acceso directo al `<html>` desde un layout anidado) es aplicar la clase al `<div>` contenedor del layout del psicólogo:

```tsx
export default function PsychologistLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="psychologist-theme min-h-screen bg-background text-foreground">
      {children}
    </div>
  );
}
```

Esto garantiza que todos los tokens de color del psicólogo (`--primary: #6c5dd3`, `--background: #f8fafc`, etc.) se apliquen dentro de su layout sin afectar las pantallas del estudiante.

> **Verificación:** después de aplicar esto, abrir `/dashboard` del psicólogo y confirmar que el color primario sea lavanda (`#6c5dd3`) y el fondo sea `#f8fafc`, no el verde del estudiante.

---

## 2. Sesión 2 — Capa de repositorios para alertas y casos

### Objetivo
Crear el repositorio de alertas y casos antes de implementar los endpoints. Esta sesión es solo código de infraestructura; no hay endpoints nuevos expuestos.

### 2.1 Interfaces a agregar en `repositories/interfaces.ts`

Extraídas de `persistence-and-infraestructure.txt` y `attention-alerts-module.txt`:

```typescript
export interface IAlertRepository {
  findPendingByCampus(campus: UdecCampus): Promise<AlertSummary[]>;
  findById(id: string): Promise<AlertDetail | null>;
  acceptAlert(alertId: string, psychologistId: string): Promise<Alert>;
  updateStatus(alertId: string, status: AlertStatus): Promise<Alert>;
}

export interface ICaseRepository {
  findById(id: string): Promise<ClinicalCase | null>;
  findByPsychologist(psychologistId: string): Promise<ClinicalCase[]>;
  findByStudent(studentId: string): Promise<ClinicalCase[]>;
  save(caseData: Partial<ClinicalCase>): Promise<ClinicalCase>;
  updateStatus(caseId: string, status: CaseStatus): Promise<ClinicalCase>;
  setFormalActive(studentId: string): Promise<void>;
}

export interface IChatRepository {
  saveRoom(room: Partial<ChatRoom>, caseId: string): Promise<ChatRoom>;
  findRoomByCase(caseId: string): Promise<ChatRoom | null>;
  saveMessage(message: Partial<ChatMessage>, roomId: string): Promise<ChatMessage>;
  findMessages(roomId: string, cursor?: string, limit?: number): Promise<ChatMessage[]>;
  findInactiveCasesForRecapture(daysInactive: number): Promise<ClinicalCase[]>;
}
```

### 2.2 Implementaciones a crear

```
src/backend/src/repositories/
  interfaces.ts            ← actualizar con las interfaces anteriores
  psychologist.repository.ts  ← ya creado en sesión 1
  alert.repository.ts
  case.repository.ts
  chat.repository.ts
```

**Regla crítica para la implementación:** cada repositorio recibe el `SupabaseClient` por constructor. Nunca importar `supabaseAdmin` directamente dentro de un repositorio; el cliente se inyecta desde el servicio que lo instancia.

**Regla sobre nombres de tablas:** las tablas en la BD están en **singular** (`alert`, `clinical_case`, `chat_room`, `chat_message`, `psychologist`). No usar plural. Revisar `mindbridge_schema_compact.md` antes de escribir cualquier query.

### 2.3 Tipos de dominio a agregar en `src/backend/src/types/domain.ts`

Agregar (no reemplazar lo existente):
```typescript
// Extraídos de MindBridge_entity_reference.md y types.txt
export type AlertStatus = 'PENDING' | 'ACCEPTED' | 'SERVED' | 'FALSE_POSITIVE' | 'COMPLEMENTARY';
export type CaseStatus = 'OPENED' | 'ASSIGNED' | 'ARCHIVED' | 'RESOLVED';
export type CaseType = 'AUTOMATIC_ALERT' | 'SELF_REFERRAL';
export type ChatStatus = 'ACTIVE' | 'CLOSED_BY_INACTIVITY' | 'ARCHIVED';
export type MessageType = 'STANDARD_TEXT' | 'APPOINTMENT_PROPOSAL' | 'CHARACTERIZATION_LINK';
export type MessageSenderRole = 'STUDENT' | 'PSYCHOLOGIST';
export type ShiftType = 'SHIFT_1' | 'SHIFT_2';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface AlertSummary {
  id: string;
  pseudonym: string;
  risk_level: RiskLevel;
  status: AlertStatus;
  is_complementary: boolean;
  trigger_text: string;
  generated_at: string;
  campus: string;
}

export interface AlertDetail extends AlertSummary {
  nlp_scores: {
    depression: number;
    anxiety: number;
    suicidal: number;
    imb: number;
    suicidal_override: boolean;
    risk_level: RiskLevel;
  };
  deanonymized_data?: {
    student_code: string;
    campus: string;
    full_name?: string;
    email?: string;
    program?: string;
    semester?: number;
  };
  post_history: Array<{ id: string; text_content: string; created_at: string; risk_level?: RiskLevel }>;
  previous_alerts: AlertSummary[];
}
```

---

## 3. Sesión 3 — Backend: módulo de alertas

### Objetivo
Implementar los endpoints de alertas del psicólogo usando el repositorio creado en la sesión anterior.

### 3.1 Archivos a crear

```
src/backend/src/modules/alerts/
  alerts.router.ts
  alerts.service.ts
  alerts.schema.ts
```

### 3.2 Endpoints (extraídos de `contrato_backend_mindbridge_v1.1.md` §8)

#### `GET /api/v1/alerts`
- Requiere JWT con `role = 'psychologist'`
- Filtra por `campus = request.user.campus` — **nunca omitir este filtro**
- Ordena: `HIGH` primero, luego por `generated_at` descendente
- Query params: `status?`, `risk_level?`, `limit?`, `cursor?`
- La vista de resumen **nunca** expone `student_id`, nombre real ni código en texto plano
- Solo expone: `id`, `pseudonym`, `risk_level`, `status`, `is_complementary`, `trigger_text`, `generated_at`, `campus`

**Cómo resolver el pseudónimo:** la alerta tiene `student_id`. Con ese ID se busca el pseudónimo activo en la tabla `pseudonym` (WHERE `student_id = X AND status = 'ACTIVE'`). Hacerlo en el repositorio de alertas, no en el servicio.

#### `GET /api/v1/alerts/:alertId`
- Si el psicólogo autenticado es `assigned_psychologist_id`, responde con `deanonymized_data`
- Si la alerta está `PENDING`, `deanonymized_data = null`
- Incluye `nlp_scores` del `nlp_analysis` vinculado, `post_history` y `previous_alerts`
- Error `403 ALERT_ASSIGNED_TO_ANOTHER` si la alerta está aceptada por otro psicólogo

#### `POST /api/v1/alerts/:alertId/accept` (RF19)
- Cambia `alert.status = 'ACCEPTED'`, asigna `assigned_psychologist_id = request.user.id`
- Cambia `clinical_case.status = 'ASSIGNED'`, asigna `clinical_case.assigned_psychologist_id`
- **Control de concurrencia optimista:** usar una transacción o verificar que `status = 'PENDING'` antes de actualizar. Si otro psicólogo ya la aceptó: `409 ALERT_ALREADY_ACCEPTED`
- La aceptación **revela la identidad** del estudiante: descifrar `codigo_estudiante_encrypted` con AES-256-GCM y retornar en la respuesta
- Retorna el objeto `case` completo (ver contrato backend §8)

#### `PATCH /api/v1/alerts/:alertId/status`
- Solo el psicólogo `assigned_psychologist_id` puede ejecutar esta acción
- Valores permitidos: `SERVED`, `FALSE_POSITIVE`
- `FALSE_POSITIVE` registra el evento en el historial del caso para retroalimentación del NLP

### 3.3 Estructura del servicio (patrón a seguir)

```typescript
// alerts.service.ts
export class AlertsService {
  constructor(
    private readonly alertRepo: IAlertRepository,
    private readonly caseRepo: ICaseRepository,
    private readonly encryption: EncryptionService,
  ) {}

  async getAlertsForPsychologist(psychologistId: string, campus: UdecCampus, filters: AlertFilters): Promise<AlertSummary[]> { ... }
  async getAlertDetail(alertId: string, psychologistId: string): Promise<AlertDetail> { ... }
  async acceptAlert(alertId: string, psychologistId: string, campus: UdecCampus): Promise<AlertAcceptResult> { ... }
  async updateAlertStatus(alertId: string, psychologistId: string, status: 'SERVED' | 'FALSE_POSITIVE'): Promise<Alert> { ... }
}
```

El router instancia el servicio inyectando los repositorios:

```typescript
// alerts.router.ts
const alertRepo = new SupabaseAlertRepository(supabaseAdmin);
const caseRepo = new SupabaseCaseRepository(supabaseAdmin);
const alertsService = new AlertsService(alertRepo, caseRepo, encryptionService);
```

---

## 4. Sesión 4 — Backend: módulo de casos y chat

### 4.1 Módulo de casos

```
src/backend/src/modules/cases/
  cases.router.ts
  cases.service.ts
  cases.schema.ts
```

**Endpoints:**

- `GET /api/v1/cases` — lista casos del psicólogo; filtra por `assigned_psychologist_id = request.user.id`
- `GET /api/v1/cases/:caseId` — detalle del caso; valida que el psicólogo sea el asignado
- `POST /api/v1/cases` (rol: estudiante) — self-referral; crea `clinical_case` con `case_type = 'SELF_REFERRAL'`
- `PATCH /api/v1/cases/:caseId/formal-active` — marca `student.caso_formal_activo = true`; irreversible desde UI (RF17)

### 4.2 Módulo de chat (psicólogo)

El módulo `chat` ya existe con `chat.router.ts`, `chat.service.ts`, `chat.schema.ts`. Verificar qué está implementado antes de crear nada nuevo.

Endpoints que deben existir o completarse:

- `POST /api/v1/cases/:caseId/chat` — crea `chat_room`; solo rol `psychologist`; el psicólogo es `psychologist_id`
- `GET /api/v1/cases/:caseId/chat` — historial de mensajes; accesible para psicólogo asignado y estudiante receptor
- `POST /api/v1/cases/:caseId/chat/messages` — enviar mensaje
- `PATCH /api/v1/cases/:caseId/chat` — cambiar estado a `ARCHIVED`

**Regla sobre tipos de mensaje:**
- `CHARACTERIZATION_LINK`: el `text_content` que envíe el cliente es ignorado; el backend inyecta la URL de `process.env.FO_BU_O13_FORM_URL`
- Solo el psicólogo puede enviar `APPOINTMENT_PROPOSAL` y `CHARACTERIZATION_LINK`
- El estudiante solo puede enviar `STANDARD_TEXT`

---

## 5. Sesión 5 — Frontend: dashboard y lista de alertas del psicólogo

### Objetivo
Panel principal con lista de alertas priorizadas.

### 5.1 Archivos a crear/modificar

```
src/frontend/src/app/(psychologist)/dashboard/
  page.tsx            ← reemplazar el stub actual
  layout.tsx          ← sidebar fijo del psicólogo

src/frontend/src/components/alerts/
  alert-card.tsx
  alert-list.tsx
  risk-badge.tsx      ← puede reusarse del forum si ya existe; verificar antes de crear
```

### 5.2 Layout del psicólogo

El layout del psicólogo tiene sidebar fijo a la izquierda (equivalente al layout del estudiante pero con los items de navegación del psicólogo). Estructura:

```tsx
// (psychologist)/layout.tsx
<div className="psychologist-theme min-h-screen bg-background">
  <PsychologistSidebar />          {/* fixed left-0 top-0, w-56 */}
  <main className="pl-56">         {/* offset igual al sidebar */}
    {children}
  </main>
</div>
```

Items de navegación del sidebar:
- Dashboard (`/dashboard`)
- Mis casos (`/dashboard/cases`) — se construye en sesión posterior
- Chat (`/dashboard/chat`) — se construye en sesión posterior

### 5.3 AlertCard

Propiedades necesarias (extraídas de `AlertSummary` del backend):

```typescript
interface AlertCardProps {
  id: string;
  pseudonym: string;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  status: AlertStatus;
  is_complementary: boolean;
  trigger_text: string;
  generated_at: string;
}
```

Diseño (de `contrato_frontend_mindbridge_v1.2.md` §6.1 y `principios_diseno_ui_mindbridge.md`):
- `RiskBadge` con colores semánticos: verde `risk-low`, ámbar `risk-medium`, rojo `risk-high` (tokens ya en `globals.css`)
- Botón "Aceptar caso" visible directamente en la tarjeta para alertas `PENDING`
- Las alertas `COMPLEMENTARY` tienen etiqueta visual diferenciadora
- **Efecto Von Restorff aplicado:** las alertas `HIGH` tienen borde izquierdo rojo pronunciado (`border-l-4 border-[--risk-high-text]`)

### 5.4 Dashboard page

El dashboard es un Server Component que hace fetch al backend. Muestra:
- Resumen de conteos (pendientes, nivel alto, etc.) — se puede añadir un endpoint `GET /api/v1/alerts/stats` si el tiempo lo permite, o calcular del lado del cliente a partir del array de alertas
- Lista de alertas ordenada (AlertList)

**Realtime (Supabase Postgres Changes):** agregar suscripción en un Client Component para recibir nuevas alertas sin recargar la página:

```typescript
// En un componente Client Component que envuelve AlertList
const channel = supabase
  .channel('alerts-feed')
  .on('postgres_changes', {
    event: 'INSERT', schema: 'public', table: 'alert',
    filter: `campus=eq.${user.campus}`,
  }, ({ new: alert }) => {
    setAlerts(prev => [mapAlert(alert), ...prev]);
  })
  .subscribe();
```

---

## 6. Sesión 6 — Frontend: detalle de alerta y aceptación

### Archivos a crear

```
src/frontend/src/app/(psychologist)/dashboard/alerts/
  [alertId]/
    page.tsx

src/frontend/src/components/alerts/
  alert-detail-panel.tsx    ← Client Component (gestiona estado de aceptación)
  nlp-scores-panel.tsx      ← UI Component (muestra puntuaciones)
  post-history-list.tsx     ← UI Component
```

### Flujo de aceptación (RF19)

1. Psicólogo entra a `/dashboard/alerts/:alertId`
2. Ve vista de resumen: trigger text, risk badge, NLP scores
3. `deanonymized_data` está oculto (null)
4. Botón "Aceptar caso" — al hacer clic llama `POST /api/v1/alerts/:alertId/accept`
5. Si `409 ALERT_ALREADY_ACCEPTED` → mostrar mensaje "Este caso ya fue tomado"
6. Si éxito → revelar `deanonymized_data` en la misma pantalla sin redirigir
7. Habilitar botón "Iniciar chat" que lleva a la pantalla de chat del caso

---

## 7. Sesión 7 — Frontend: pantalla de chat del psicólogo

### Archivos a modificar/crear

```
src/frontend/src/app/(psychologist)/dashboard/chat/
  page.tsx            ← lista de chats activos

src/frontend/src/app/(psychologist)/dashboard/cases/
  [caseId]/
    chat/
      page.tsx         ← sala de chat individual
```

El componente `chat-widget.tsx` ya existe. Adaptar para el rol del psicólogo:
- El psicólogo es el iniciador del chat
- Puede enviar `APPOINTMENT_PROPOSAL` y `CHARACTERIZATION_LINK` además de `STANDARD_TEXT`
- La suscripción Realtime usa el patrón documentado en `contrato_frontend_mindbridge_v1.2.md` § "Supabase Realtime — implementation patterns"

---

## 8. Advertencias y trampas comunes para OpenCode

### 8.1 Nombres de tablas
Las tablas están en **singular**: `alert`, `clinical_case`, `chat_room`, `chat_message`, `psychologist`, `student`, `post`, `comment`. PostgREST también las expone en singular. No usar plural.

### 8.2 Campus isolation — regla absoluta
Cada endpoint del psicólogo que lee alertas o casos DEBE filtrar por `campus = request.user.campus`. Este valor viene del JWT, no del body. Si algún endpoint no aplica este filtro, viola RD-04 y RD-06.

### 8.3 Identidad del estudiante
- Antes de aceptar: solo el pseudónimo activo (buscar en tabla `pseudonym` WHERE `student_id = X AND status = 'ACTIVE'`)
- Después de aceptar: descifrar `codigo_estudiante_encrypted` con AES-256-GCM usando `EncryptionService` ya existente en `src/backend/src/lib/encryption.ts`
- No exponer `student_id` como UUID en ninguna respuesta de alerta pública

### 8.4 Inyección de dependencias
Los servicios reciben sus repositorios por constructor. El router crea las instancias. Nunca crear un `new SupabaseRepository()` dentro de un método de servicio.

### 8.5 RLS y supabaseAdmin
- Las queries de **lectura** que respetan RLS (psicólogo viendo sus propias alertas) pueden usar el cliente `supabaseAnon` con el JWT del usuario
- Las operaciones de **escritura administrativa** (crear psicólogo, force-reset de estado) usan `supabaseAdmin` (service_role)
- El `supabaseAdmin` nunca se pasa al frontend ni se expone en respuestas

### 8.6 Check constraint en `alert`
```sql
CONSTRAINT "chk_alert_psychologist_by_status" 
CHECK (status IN ('PENDING','COMPLEMENTARY') OR assigned_psychologist_id IS NOT NULL)
```
Al aceptar una alerta, `assigned_psychologist_id` debe asignarse en el mismo UPDATE que cambia el status a `ACCEPTED`. Hacerlo en una sola operación o en una transacción.

### 8.7 No crear endpoints de moderación del foro en este plan
El actor responsable de moderación manual está sin definir (SA-04 en entity reference). No implementar ningún endpoint de moderación en esta sesión.

### 8.8 Enums siempre en inglés
Los valores de enum en la BD y en la API son `UPPER_SNAKE_CASE` en inglés. La traducción al español para la UI es responsabilidad del archivo `src/frontend/src/lib/i18n/risk.ts` y equivalentes. No mezclar español en la API.

---

## 9. Secuencia de sesiones resumida

| Sesión | Foco | Entregable verificable |
|--------|------|----------------------|
| 1 | Registro de psicólogo + tema visual | `POST /admin/psychologists` funcional; pantalla admin; tema lavanda activo |
| 2 | Capa de repositorios | `interfaces.ts` con 4 interfaces; 4 implementaciones Supabase; tests unitarios |
| 3 | Módulo de alertas backend | `GET /alerts`, `GET /alerts/:id`, `POST /alerts/:id/accept`, `PATCH /alerts/:id/status` |
| 4 | Módulo de casos y chat backend | `GET /cases`, `POST /cases`, `POST /cases/:id/chat`, `POST /cases/:id/chat/messages` |
| 5 | Dashboard y lista de alertas frontend | Pantalla `/dashboard` con AlertList, RiskBadge, Realtime |
| 6 | Detalle de alerta y aceptación frontend | Pantalla `/dashboard/alerts/:id` con flujo de aceptación |
| 7 | Chat del psicólogo frontend | Sala de chat con Supabase Realtime |

---

## 10. Lo que este plan explícitamente NO cubre

- Integración con NLP (el análisis ya ocurre por el flujo del foro del estudiante; las alertas ya se crean desde ese pipeline)
- Workflow de exportación de caso a Adviser (RF04) — aplazar para después de tener el chat funcionando
- Protocolo de recaptura de chats inactivos (RF20) — cron job, aplazar
- Integración con Google Calendar (RF03) — viabilidad técnica pendiente (D-33)
- Participación del psicólogo en el foro (RF06) — deshabilitada por defecto, no construir UI para habilitarla en el MVP

