# Blockers conocidos

## Error etiquetas depresión/ansiedad en dataset NLP — RESOLVED

**Service:** nlp-service
**Description:** `prepare_datasets.py` producía 0 positivos para `depresion` y `ansiedad`
en `unified_dataset.json`. Fine-tuning del modelo clínico bloqueado hasta resolución.
**Resolution:** El modelo clínico se entrenó exitosamente. El dataset fue corregido por un
teammate usando una versión actualizada de `prepare_datasets.py`. El modelo alcanzó
F1 suicidal 0.816 (supera umbral 0.70), F1 depression 0.564 y F1 anxiety 0.596.

## Schema Supabase no desplegado — OPEN

**Service:** infraestructura
**Description:** `schema_mindbridge_v1.1.sql` está listo pero no ha sido ejecutado en Supabase.
Backend no puede conectar BD hasta que esté desplegado y las RLS configuradas.
**Resolution:** Pendiente. Requiere credenciales de Supabase (URL + service role key).

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
