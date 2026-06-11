# Plan de Pulido — Módulo del Psicólogo
## MindBridge · Post-Sesión 7

---

## Diagnóstico

Con base en el código de `cases.service.ts`, `alerts.service.ts` y el
`page.tsx` de casos, se identificaron los siguientes problemas concretos:

| # | Problema | Capa | Gravedad |
|---|----------|------|----------|
| P1 | Routing incorrecto: `/dashboard/chat?caseId=` en lugar de `/cases/[caseId]` | Frontend | Alta |
| P2 | Sidebar apunta a rutas inexistentes (`/dashboard/cases`) | Frontend | Alta |
| P3 | Un estudiante puede acumular varios `clinical_case` activos; `acceptAlert()` siempre crea caso nuevo | Backend | Alta |
| P4 | Datos complementarios no aparecen aunque existen en BD | Backend | Media |
| P5 | Fecha de apertura, última actualización y estado de exportación ausentes en la UI del caso | Frontend | Media |
| P6 | Historial de publicaciones no filtra por fecha de última alerta | Backend + Frontend | Media |
| P7 | El chat envía mensajes al backend en lugar de pintarlos localmente | Frontend | Media |
| P8 | Acciones "Marcar atendido" y "Falso positivo" deshabilitadas y sin mapeo correcto | Frontend | Media |
| P9 | `cases/page.tsx` navega al chat con query param en lugar de al caso | Frontend | Alta |
| P10 | Reconexión Realtime en dashboard no auditada | Frontend | Baja |

---

## Arquitectura de routing definitiva

Antes de implementar cualquier corrección, esta es la estructura de rutas
que debe quedar al final del plan:

```
/dashboard                        → overview + feed de alertas en tiempo real
/alerts/[alertId]                 → detalle de alerta (ya existe, no cambia)
/cases                            → lista de casos asignados al psicólogo
/cases/[caseId]                   → detalle del caso + chat integrado
```

El chat **no es una ruta independiente**. Es una sección dentro de
`/cases/[caseId]`. La pantalla del caso tiene dos regiones: información
del caso a la izquierda, chat a la derecha (o inferior en mobile).

El sidebar queda:
```
Dashboard   → /dashboard
Alertas     → /alerts        (link activo, ya existe la ruta)
Mis casos   → /cases         (link activo tras esta sesión)
```

---

## Sesión A — Corrección de routing y estructura de carpetas ✅ COMPLETADA

**Objetivo:** establecer la estructura de rutas correcta sin tocar lógica
de negocio. Es la sesión más corta pero desbloquea todo lo demás.

### Archivos a crear

```
src/frontend/src/app/(psychologist)/cases/page.tsx
src/frontend/src/app/(psychologist)/cases/[caseId]/page.tsx
```

### Archivos a modificar

```
src/frontend/src/components/psychologist/PsychologistSidebar.tsx
src/frontend/src/components/alerts/alert-card.tsx
src/frontend/src/app/(psychologist)/dashboard/cases/page.tsx  → mover a /cases/page.tsx
src/frontend/src/app/(psychologist)/dashboard/chat/page.tsx   → vaciar / eliminar
```

### Cambios específicos

**`PsychologistSidebar.tsx`**
- Cambiar item "Mis casos": de `href="/dashboard/cases"` a `href="/cases"`
- El item "Chat" que existía como ruta independiente se elimina del sidebar;
  el chat vive dentro de cada caso

**`cases/page.tsx`** (nuevo, mover lógica del `dashboard/cases/page.tsx`)
- Misma lógica del archivo actual pero con una corrección: el `Link` de
  cada tarjeta debe apuntar a `/cases/${c.id}`, no a
  `/dashboard/chat?caseId=${c.id}`

**`cases/[caseId]/page.tsx`** (nuevo, stub)
- Por ahora renderiza el `caseId` recibido como param y un placeholder
  "Detalle del caso — en construcción". La lógica real llega en Sesión C.

**`alert-card.tsx`**
- No requiere cambios de routing; el card ya navega a
  `/dashboard/alerts/${id}` que es correcto.

### Validación de la sesión

```bash
tsc --noEmit   # 0 errores
```

Verificar manualmente:
- `/cases` carga la lista de casos
- Click en una tarjeta → navega a `/cases/[caseId]`
- `/alerts/[alertId]` sigue funcionando sin cambios

---

## Sesión B — Corrección de caso único por estudiante ✅ COMPLETADA

**Objetivo:** garantizar que un estudiante tenga como máximo un
`clinical_case` activo. Todas las alertas posteriores se asocian al caso
existente.

### Problema en el código actual

`AlertsService.acceptAlert()` siempre ejecuta:

```typescript
// Crea clinical_case AUTOMATIC_ALERT con status ASSIGNED
```

Si el estudiante ya tiene un caso activo (`OPENED` o `ASSIGNED`), se crea
uno nuevo en lugar de reutilizar el existente.

### Corrección en `alerts.service.ts`

En el método `acceptAlert()`, antes de insertar el `clinical_case`,
buscar si ya existe uno activo para ese estudiante:

```typescript
// 1. Buscar caso activo existente del estudiante
const existingCase = await this.supabase
  .from("clinical_case")
  .select("id, status")
  .eq("student_id", studentId)
  .in("status", ["OPENED", "ASSIGNED"])
  .order("opened_at", { ascending: false })
  .limit(1)
  .maybeSingle();

// 2. Si existe → asociar alerta al caso existente y marcarla COMPLEMENTARY
//    Si no existe → crear caso nuevo
const caseId = existingCase?.id ?? (await createNewCase(studentId));

// 3. Actualizar la alerta con el case_id correcto
// 4. Si se usó caso existente → marcar alerta como is_complementary = true
```

### Corrección en `cases.service.ts`

El método `listCases()` ya filtra por `assigned_psychologist_id`, por lo
que si la BD es consistente (un caso por estudiante), la lista mostrará
una tarjeta por estudiante. No requiere cambios adicionales.

### Migración de datos

Si en la BD ya existen estudiantes con múltiples casos activos por las
pruebas anteriores, ejecutar este script de limpieza en Supabase SQL Editor
**antes de desplegar la corrección**:

```sql
-- Identificar estudiantes con múltiples casos activos
SELECT student_id, COUNT(*) as casos_activos
FROM clinical_case
WHERE status IN ('OPENED', 'ASSIGNED')
GROUP BY student_id
HAVING COUNT(*) > 1;

-- Cerrar los duplicados, conservar el más antiguo
UPDATE clinical_case
SET status = 'ARCHIVED'
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY student_id
             ORDER BY opened_at ASC
           ) as rn
    FROM clinical_case
    WHERE status IN ('OPENED', 'ASSIGNED')
  ) ranked
  WHERE rn > 1
);
```

### Validación de la sesión

Crear dos alertas para el mismo estudiante desde el SQL snippet. Verificar:
- La segunda alerta tiene `is_complementary = true` en la BD
- En `/cases` hay una sola tarjeta para ese estudiante
- Ambas alertas aparecen en el detalle del caso

---

## Sesión C — Pantalla de detalle del caso (`/cases/[caseId]`)

**Objetivo:** construir la vista completa del caso. Es la sesión más densa.

### Endpoint backend a verificar/completar

`GET /api/v1/cases/:caseId` debe retornar:

```typescript
{
  id: string;
  case_type: "AUTOMATIC_ALERT" | "SELF_REFERRAL";
  status: "OPENED" | "ASSIGNED" | "ARCHIVED" | "RESOLVED";
  opened_at: string;           // ISO 8601
  updated_at: string;          // ISO 8601
  adviser_export_status: "NOT_EXPORTED" | "EXPORTED_SUCCESS" | "FAILED";
  student: {
    pseudonym: string;
    campus: string;
    student_code: string;      // desencriptado (el psicólogo ya aceptó el caso)
    complementary_data: {      // null si no existen
      nombre_completo: string | null;
      programa: string | null;
      semestre: number | null;
      correo_contacto: string | null;
    } | null;
  };
  alerts: AlertSummary[];      // alertas asociadas al caso
  post_history: PostItem[];    // publicaciones del estudiante anteriores
                               // a la fecha de la alerta más reciente
  chat_room: {
    id: string | null;
    status: "ACTIVE" | "ARCHIVED" | null;
  };
}
```

El campo `complementary_data` requiere un join adicional. En
`getCaseById()` de `cases.service.ts`, agregar:

```typescript
.select(`
  *,
  student!inner (
    campus,
    codigo_estudiante_encrypted,
    caso_formal_activo,
    complementary_data (
      nombre_completo,
      programa,
      semestre,
      correo_contacto
    ),
    pseudonym!fk_student_active_pseudonym (
      texto,
      avatar_url
    )
  )
`)
```

El `post_history` filtrado por fecha de la alerta más reciente se obtiene
con una query separada dentro de `getCaseById()`:

```typescript
// Fecha de la alerta más reciente del caso
const { data: latestAlert } = await supabase
  .from("alert")
  .select("generated_at")
  .eq("case_id", caseId)
  .order("generated_at", { ascending: false })
  .limit(1)
  .maybeSingle();

const cutoffDate = latestAlert?.generated_at ?? new Date().toISOString();

// Publicaciones del estudiante anteriores al corte
const { data: posts } = await supabase
  .from("post")
  .select("id, text_content, created_at")
  .eq("student_id", caseData.student_id)
  .lte("created_at", cutoffDate)
  .eq("status", "VISIBLE")
  .order("created_at", { ascending: false })
  .limit(20);
```

### Layout de la pantalla

```
┌─────────────────────────────────────────────────────────────────┐
│  /cases/[caseId]                                                │
├──────────────────────────────┬──────────────────────────────────┤
│  COLUMNA IZQUIERDA (w-96)    │  COLUMNA DERECHA (flex-1)        │
│                              │                                  │
│  ┌─────────────────────────┐ │  ┌──────────────────────────────┐│
│  │ INFO DEL CASO           │ │  │ CHAT                         ││
│  │ Pseudónimo              │ │  │ (chat-widget reutilizado)    ││
│  │ Estado                  │ │  │                              ││
│  │ Tipo                    │ │  │ Si no hay chat_room:         ││
│  │ Apertura                │ │  │ botón "Iniciar conversación" ││
│  │ Última actualización    │ │  │                              ││
│  │ Exportado a Adviser     │ │  └──────────────────────────────┘│
│  └─────────────────────────┘ │                                  │
│                              │                                  │
│  ┌─────────────────────────┐ │                                  │
│  │ ESTUDIANTE              │ │                                  │
│  │ Campus                  │ │                                  │
│  │ Código                  │ │                                  │
│  │ Nombre (si existe)      │ │                                  │
│  │ Programa / Semestre     │ │                                  │
│  └─────────────────────────┘ │                                  │
│                              │                                  │
│  ┌─────────────────────────┐ │                                  │
│  │ ACCIONES                │ │                                  │
│  │ [Marcar atendido]       │ │                                  │
│  │ [Falso positivo]        │ │                                  │
│  │ [Exportar PDF] (soon)   │ │                                  │
│  └─────────────────────────┘ │                                  │
│                              │                                  │
│  ┌─────────────────────────┐ │                                  │
│  │ ALERTAS DEL CASO        │ │                                  │
│  │ (lista de todas las     │ │                                  │
│  │  alertas asociadas,     │ │                                  │
│  │  incl. complementarias) │ │                                  │
│  └─────────────────────────┘ │                                  │
│                              │                                  │
│  ┌─────────────────────────┐ │                                  │
│  │ HISTORIAL               │ │                                  │
│  │ publicaciones ordenadas │ │                                  │
│  │ por fecha (descendente) │ │                                  │
│  └─────────────────────────┘ │                                  │
└──────────────────────────────┴──────────────────────────────────┘
```

### Componentes a crear

```
src/frontend/src/components/cases/case-info-panel.tsx
src/frontend/src/components/cases/student-data-panel.tsx
src/frontend/src/components/cases/case-actions.tsx
src/frontend/src/components/cases/case-alert-list.tsx
src/frontend/src/components/cases/case-post-history.tsx
```

Estos componentes son Server Components puros (solo renderizan datos).
`case-actions.tsx` es el único Client Component porque gestiona el estado
de los botones y las mutaciones.

### Mapeo de acciones a endpoints

| Botón | Endpoint | Body |
|-------|----------|------|
| Marcar atendido | `PATCH /api/v1/alerts/:alertId/status` | `{ status: "SERVED" }` |
| Falso positivo | `PATCH /api/v1/alerts/:alertId/status` | `{ status: "FALSE_POSITIVE" }` |
| Exportar PDF | Deshabilitado con tooltip "Próximamente" | — |

> **Nota:** estas acciones operan sobre la **alerta**, no sobre el
> `clinical_case`. El enum `FALSE_POSITIVE` existe en `alert_status`.
> No modificar `clinical_case.status` con estos botones.

Para obtener el `alertId` correspondiente, el caso ya devuelve `alerts[]`
en la respuesta. Tomar la alerta más reciente con `status = 'ACCEPTED'`.

### Complemento: Lista de alertas en el detalle del caso

Además del historial de publicaciones, el detalle del caso debe incluir una
sección que liste todas las alertas asociadas al caso (incluidas las
complementarias).

**Backend (`getCaseById()`):** El campo `alerts[]` ya está especificado en el
contrato de respuesta arriba. Verificar que la query incluya el join a `alert`
filtrado por `case_id`.

**Componente frontend a crear:**
```
src/frontend/src/components/cases/case-alert-list.tsx
```
Este componente recibe `alerts: AlertSummary[]` y renderiza una lista
cronológica con el estado, fecha, tipo y nivel de riesgo de cada alerta.

### Complemento: Filtro de alertas complementarias en dashboard

Las alertas con `is_complementary = true` deben excluirse de la lista de
alertas en `/dashboard`. Solo deben ser visibles desde el detalle del caso
(`/cases/[caseId]`).

**Backend:** En `GET /api/v1/alerts`, agregar filtro
`is_complementary.is.null` (o `is_complementary.eq.false`) en la query para
que el endpoint no retorne alertas complementarias.

**Frontend:** El dashboard (`/dashboard/page.tsx`) solo muestra las alertas
devueltas por el endpoint filtrado. Las alertas complementarias se visualizan
exclusivamente en `case-alert-list.tsx` dentro del detalle del caso.

### Validación de la sesión

```bash
tsc --noEmit   # 0 errores
```

Verificar manualmente:
- Datos del estudiante aparecen (incluidos los complementarios si existen)
- El historial muestra publicaciones anteriores a la fecha de la alerta
- Las alertas del caso se listan en orden cronológico
- Las alertas complementarias NO aparecen en `/dashboard` pero SÍ en `/cases/[caseId]`
- Los botones de acción disparan las llamadas correctas al backend
- "Exportar PDF" aparece deshabilitado con tooltip

---

## Sesión D — Chat funcional ✅ COMPLETADA

**Objetivo:** conectar el chat de la pantalla del caso al backend. El
componente `chat-widget.tsx` ya existe; solo hay que cablearlo.

### Prerequisito

Esta sesión solo comienza cuando la Sesión C está estable y el chat pinta
mensajes localmente sin errores en consola.

### Cambios en el chat

**Crear sala si no existe:** ✅
Al cargar `/cases/[caseId]`, si `chat_room` es `null`, mostrar botón
"Iniciar conversación" que llama `POST /api/v1/cases/:caseId/chat`.
Tras la respuesta exitosa, renderizar el widget de chat con el `chat_id`
recibido.

**Conectar envío de mensajes:** ✅
El input del chat llama `POST /api/v1/cases/:caseId/chat/messages`. El
mensaje se agrega optimistamente al estado local antes de recibir la
respuesta del servidor.

**Suscripción Realtime:** ✅
El trigger `trg_chat_message_inserted` reemplazó al anterior `trg_chat_message_broadcast`
en la BD (renombrado para mayor claridad semántica y para alinear el nombre con la
convención `trg_{table}_{operation}`). El cliente se suscribe al topic
`room:{chatRoomId}:messages`:

```typescript
const channel = supabase
  .channel(`room:${chatRoomId}:messages`)
  .on("broadcast", { event: "INSERT" }, ({ payload }) => {
    setMessages(prev => [...prev, mapMessage(payload.new)]);
  })
  .subscribe();

return () => { supabase.removeChannel(channel); };
```

**Tipos de mensaje por rol:** ✅
- Psicólogo: botones adicionales para `APPOINTMENT_PROPOSAL` y
  `CHARACTERIZATION_LINK`
- Estudiante: solo `STANDARD_TEXT` (el input estándar es suficiente)

El widget existente recibe una prop `role: "psychologist" | "student"`
que controla la visibilidad de los botones adicionales.

### Validación de la sesión

Verificar con dos ventanas (psicólogo y estudiante del mismo caso):
- Mensaje enviado por psicólogo aparece en la ventana del estudiante
  sin recargar
- `CHARACTERIZATION_LINK` muestra el URL del formulario en el chat
- `APPOINTMENT_PROPOSAL` muestra una tarjeta de propuesta de cita

### Refuerzo Realtime (post-Sesión D) ✅

Se aplicaron los siguientes refuerzos a `CaseChatShell` (`case-chat-shell.tsx`) para
robustecer la conexión Realtime:

- **setAuth:** Se agregó `useEffect` que llama `supabase.realtime.setAuth(token)` para
  inyectar el JWT del usuario en el canal, necesario para canales Realtime privados.
- **409 handling:** La inicialización de sala ahora maneja error 409 (sala ya existente)
  con un fallback a `GET`; detecta el código mediante `err.status || err.statusCode || err.error || err.message`.
- **Payload extraction 3-way:** El mapeo de mensajes entrantes usa
  `payload.payload || record || payload` con guarda `if (!msgData?.id) return` para
  manejar variaciones en la estructura del mensaje broadcast.
- **Dependencies estabilizadas:** El `useEffect` de suscripción usa `chatRoom?.id` (primitivo)
  en lugar de `chatRoom` (objeto) para evitar re-ejecuciones innecesarias.
- **DB trigger fix — `realtime.send()` en lugar de `broadcast_changes()`:** La función
  `on_chat_message_inserted()` se reescribió para usar `realtime.send()`, que acepta
  `jsonb` directamente y resuelve el error PostgreSQL 42883 (type mismatch `record` vs `jsonb`
  en `broadcast_changes`):

  ```sql
  CREATE OR REPLACE FUNCTION public.on_chat_message_inserted()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  BEGIN
      PERFORM realtime.send(
          row_to_json(NEW)::jsonb,
          'INSERT',
          'room:' || NEW.chat_room_id::text || ':messages',
          true    -- private channel, coincide con frontend { private: true }
      );
      RETURN NEW;
  END;
  $$;
  ```

  **Limpieza:** `trg_chat_message_broadcast` → DROPPED, `on_chat_message_broadcast()` → DROPPED,
  `trg_chat_message_inserted` → RECREADO apuntando a la nueva función.

---

## Sesión E — Estabilización y cierre

**Objetivo:** auditoría final antes de preparar el entregable.

### Auditoría Realtime en dashboard

El comportamiento de reconexión automática que observaste es esperado en
el tier gratuito de Supabase, pero puede haber canales duplicados si el
componente se remonta. Verificar en el Client Component del dashboard:

```typescript
useEffect(() => {
  const channel = supabase.channel("psychologist-alerts")
    .on("postgres_changes", { ... }, handler)
    .subscribe();

  // Este cleanup es CRÍTICO — sin él se acumulan canales
  return () => { supabase.removeChannel(channel); };
}, []); // dependencias vacías = solo se ejecuta una vez
```

Si el array de dependencias incluye variables que cambian (por ejemplo
`user.campus`), el effect se re-ejecuta y crea canales duplicados. La
solución es memoizar `user.campus` o asegurarse de que el array de
dependencias sea estable.

### Prueba final de aislamiento de campus

| Escenario | Resultado esperado |
|-----------|-------------------|
| Alerta de PIEDRA_BOLIVAR visible para psicólogo de ZARAGOCILLA | No visible |
| Alerta de ZARAGOCILLA visible para psicólogo de PIEDRA_BOLIVAR | No visible |
| Psicólogo intenta abrir caso de otra sede por URL directa | 403 del backend |
| Psicólogo intenta aceptar alerta de otra sede por URL directa | 403 del backend |

### Verificación del FK de pseudónimo

El fix `pseudonym!fk_student_active_pseudonym` (en lugar de
`pseudonym!active_pseudonym_id`) está documentado en `AGENTS.md`. Verificar
que ningún query en `forum.service.ts` o `students.service.ts` use el
nombre antiguo.

### Notificaciones (RF15) — fuera del alcance de este plan

Las notificaciones son el módulo más grande sin implementar. Se excluyen
deliberadamente de este plan de pulido porque:
- No están bloqueadas por nada de lo que se corrige aquí
- Requieren un módulo propio en backend (`/modules/notifications/`) y
  un componente nuevo en frontend (badge + panel)
- El plan de sesiones las catalogó como trabajo posterior al módulo del
  psicólogo

El orden recomendado al terminar este plan es:
1. Notificaciones (RF15)
2. Exportación PDF (RF04) — si el tiempo lo permite antes del 11/06

---

## Orden de ejecución

```
A → B → C → D → E
```

La sesión A es el prerequisito estricto de todas las demás porque
establece dónde viven las rutas. La sesión B puede ejecutarse en paralelo
con A si se tiene acceso simultáneo al backend. La sesión C es la más
larga y merece el prompt más detallado. D y E son pequeñas.

**Estimación:** con OpenCode en modo ejecución directa (no modo plan),
A y B caben en un prompt cada una. C requiere dos prompts (backend
primero, frontend después). D y E caben en un prompt cada una.

---

## Resumen de archivos por sesión

| Sesión | Crea | Modifica | Elimina |
|--------|------|----------|---------|
| A | `cases/page.tsx`, `cases/[caseId]/page.tsx` | `PsychologistSidebar.tsx`, `alert-card.tsx` | `dashboard/chat/page.tsx` |
| B | — | `alerts.service.ts` | — |
| C | `case-info-panel.tsx`, `student-data-panel.tsx`, `case-actions.tsx`, `case-alert-list.tsx`, `case-post-history.tsx`, `cases/[caseId]/page.tsx` (reemplaza stub) | `cases.service.ts` (getCaseById), `alerts.service.ts` (filtro complementarias) | — |
| D | — | `chat-widget.tsx`, `cases/[caseId]/page.tsx` | — |
| E | — | Client Component del dashboard (useEffect cleanup) | — |
