# Decisiones de diseño canónicas

Estas decisiones están cerradas. No se reabren sin justificación explícita documentada
y actualización del número de versión del contrato correspondiente.

---

## Separación identidad / seudónimo

**Context:** El sistema requiere anonimato controlado: el estudiante opera bajo seudónimo
pero la identidad real debe ser recuperable bajo condiciones autorizadas.
**Decision:** `student.active_pseudonym_id` → tabla `pseudonym` con FK diferida.
La clase `IdentityResolutionRing` del modelo conceptual se absorbe en esta relación.
El aislamiento se delega a `ISecurityAndAccess.deanonymize()`.
**Consequence:** No existe tabla separada para la resolución de identidad.
La de-anonimización ocurre en la capa de aplicación, no en SQL.

---

## Moderación retroactiva

**Context:** D-09 establece que el contenido debe publicarse de inmediato sin moderación previa.
**Decision:** El contenido es visible al instante (`status = VISIBLE`). La moderación ocurre
después del análisis NLP o mediante acción manual. El `status` se actualiza a `MODERATED`
retroactivamente.
**Consequence:** Un estudiante puede ver su contenido publicado y luego verlo desaparecer.
El flujo de publicación responde 201 antes de que el análisis termine.

---

## Normas de comunidad: campo binario único

**Context:** El contrato NLP v6 distingue entre agresión interpersonal y discurso de odio
como posibles dimensiones separadas.
**Decision:** MVP usa un único campo binario `cumple_normas`. La distinción `v_agresion`/`v_odio`
es extensión futura. `cumple_normas = false` se reserva exclusivamente para contenido
agresivo hacia terceros.
**Consequence:** El malestar del autor, incluida la ideación suicida, produce siempre
`cumple_normas = true`.

---

## Enums en inglés en BD y API

**Decision:** Todos los valores de enum almacenados en PostgreSQL y retornados por la API
están en `UPPER_SNAKE_CASE` inglés. La traducción al español para la UI ocurre en
`frontend/src/lib/i18n/risk.ts`.
**Consequence:** Nunca renderizar un valor de enum directamente en la UI sin pasar por el
diccionario de traducción.

---

## Paginación del foro por cursor

**Decision:** Cursor basado en `created_at` (ISO 8601). Sin scroll infinito.
El frontend envía el cursor del último elemento visible en cada solicitud.
**Consequence:** Implementación sin `OFFSET`. Consistente ante inserciones concurrentes.

---

## Turnos del psicólogo

**Decision:** `SHIFT_1` 07:00–14:59:59, `SHIFT_2` 15:00–21:59:59 (America/Bogota, UTC-5).
Alertas `LOW`/`MEDIUM`: solo psicólogos en turno activo.
Alertas `HIGH`: todos los psicólogos del campus, sin importar turno.
**Consequence:** El cálculo de turno activo vive en `NotificationService` del backend.
La zona horaria se inyecta desde config, no hardcodeada.

---

## Self-referral

**Decision:** `POST /cases` con `{ "case_type": "SELF_REFERRAL" }`. Listado en
`GET /cases?case_type=SELF_REFERRAL`.
**Consequence:** Un estudiante no puede tener dos casos `SELF_REFERRAL` activos simultáneamente
(`409 ACTIVE_SELF_REFERRAL_EXISTS`).

---

## Roles en MVP

**Decision:** Solo `Estudiante` y `Psicólogo` tienen interfaz en el sistema.
`Administrador` y `Superadministrador` se gestionan directamente desde Supabase Studio en esta versión.
**Consequence:** Los roles están en el catálogo `rol` del schema pero sus rutas no se implementan en el MVP.

---

## NLP: ningún dato de identidad al modelo

**Decision:** El microservicio NLP recibe únicamente el hash del seudónimo, el texto
y el timestamp. Nunca recibe código estudiantil, nombre, campus ni ningún identificador real.
**Consequence:** La de-anonimización ocurre en el backend, después de que el NLP retorna el resultado.
