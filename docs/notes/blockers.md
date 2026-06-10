# Blockers conocidos

## Error etiquetas depresión/ansiedad en dataset NLP — RESOLVED

**Service:** nlp-service
**Description:** `prepare_datasets.py` producía 0 positivos para `depresion` y `ansiedad`
en `unified_dataset.json`. Fine-tuning del modelo clínico bloqueado hasta resolución.
**Resolution:** El modelo clínico se entrenó exitosamente. El dataset fue corregido por un
teammate usando una versión actualizada de `prepare_datasets.py`. El modelo alcanzó
F1 suicidal 0.816 (supera umbral 0.70), F1 depression 0.564 y F1 anxiety 0.596.

## Schema Supabase no desplegado — RESOLVED

**Service:** infraestructura
**Description:** `schema_mindbridge_v1.1.sql` estaba listo pero no había sido ejecutado en Supabase.
Backend no podía conectar BD hasta que estuviera desplegado y las RLS configuradas.
**Resolution:** Resuelto el 2026-06-07. Schema desplegado exitosamente en Supabase. Datos de prueba
insertados (psicólogo, caso clínico, sala de chat). Triggers Realtime funcionando para chat.

## Modelo clínico 800MB — despliegue — OPEN

**Service:** nlp-service
**Description:** `model.safetensors` pesa aproximadamente 800MB, lo que excede los límites
típicos de imagen Docker en plataformas como Railway y Render (límite ~500MB en planes
gratuitos). El peso combinado de `model.safetensors` + `classifier_heads.pt` es ~840MB.
**Resolution:** Pendiente. Soluciones candidatas:
(a) Subir los pesos a Hugging Face Hub privado y descargarlos al arrancar el contenedor.
(b) Alojar en Supabase Storage y descargar en init del servicio.
(c) Usar Git LFS si el despliegue lo soporta.
Decisión pendiente, a discutir con el equipo.

## Artefactos BETO incompletos — RESOLVED

**Service:** nlp-service
**Description:** `src/nlp_engine/src/models/clinical_model_v1/` contenía `model.safetensors`,
`config.json`, `tokenizer.json` y `training_metadata.json`, pero faltaban `vocab.txt`
y `special_tokens_map.json` — necesarios para que HuggingFace cargue el tokenizer.
**Resolution:** Regenerados el 2026-06-06 descargando `vocab.txt` y `special_tokens_map.json`
desde el repositorio original de HuggingFace (`dccuchile/bert-base-spanish-wwm-cased`).
El tokenizer del modelo base es idéntico al del checkpoint fine-tuneado.

## Entity reference documentation out of sync with diagrams — RESOLVED

**Service:** documentation
**Description:** `docs/models/MindBridge_entity_reference.md` contenía nombres de entidades en español
(Estudiante, Psicólogo, Publicación, etc.) y enumeraciones inconsistentes con los diagramas de verdad
en `docs/diagrams/entidades-del-negocio.txt` y `docs/diagrams/types.txt`.
**Resolution:** Actualizado el 2026-06-07. Cambios realizados:
- Renombradas todas las entidades a inglés: Estudiante→Student, Psicólogo→Psychologist, Publicación→Post, etc.
- Agregadas 5 entidades faltantes: ComplementaryData, InformedConsentSignature, Rol, Case, ChatRoom.
- Corregidas relaciones: reemplazadas referencias a "Seat" con "CampusUdeC"; actualizado cardinalities.
- Enums corregidos: AlertStatus (ATTENDED→SERVED), ChatStatus (agregado CLOSED_BY_INACTIVITY), MessageType (TEXT→STANDARD_TEXT, WELLBEING_RESOURCE→CHARACTERIZATION_LINK).
- Agregados 8 enums faltantes: AccountStatus, AdviserExportStatus, CaseStatus, CaseType, ContentType, ShiftType, ModerationAction, AcademicProgram, CampusUdeC.
- Actualizado "Immutable records" y "Key constraints" para reflejar nombres en inglés.

## Polimorfismo de encuestas (CHARACTERIZATION_LINK) — FUTURE EXTENSION

**Service:** backend
**Status:** Extension de diseño futura
**Description:** El tipo `CHARACTERIZATION_LINK` actualmente inyecta `FO_BU_O13_FORM_URL` como texto del mensaje, ignorando el `text_content` del body. Esto cubre el caso del formulario FO-BU-O13.
**Extensión planificada:** Permitir que el body acepte un campo `form_code` adicional para seleccionar entre múltiples URLs de encuesta (psicosocial, académica, caracterización general). Cada código se mapearía a una variable de entorno distinta (ej. `FORM_URL_PSYCHOSOCIAL`, `FORM_URL_ACADEMIC`). El `text_content` siempre se ignora cuando `message_type = CHARACTERIZATION_LINK`.
