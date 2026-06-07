# Estado del dataset de fine-tuning NLP

## Estado actual

### Modelo clínico ✅ ENTREGADO

El modelo clínico BETO ha sido entrenado por un teammate usando Google Colab con GPU T4.
Los artefactos entregados están en `src/nlp_engine/src/models/clinical_model_v1/`:

| Archivo | Descripción |
|---|---|
| `model.safetensors` | Pesos del backbone BETO (~800MB) |
| `classifier_heads.pt` | Cabezas de clasificación entrenadas |
| `config.json` | Configuración de arquitectura del modelo |
| `tokenizer.json` | Tokenizador serializado completo |
| `tokenizer_config.json` | Configuración del tokenizador |
| `training_metadata.json` | Métricas de entrenamiento (F1, época, hiperparámetros) |

Métricas en test set:
- F1 suicida: **0.816** ✅ (supera umbral 0.70)
- F1 depresión: **0.564** ⚠️ (por debajo del umbral 0.60)
- F1 ansiedad: **0.596** ⚠️ (por debajo del umbral 0.60)

El modelo ya está integrado en el pipeline (`BETOClinicalModel` reemplaza `ModelStub`).

### Modelo de normas de comunidad 🔲 PENDIENTE

Dataset de normas de comunidad aún no construido. Pendiente de definición por parte del equipo.

## Bloqueante activo

El script `prepare_datasets.py` tiene un error que produce 0 etiquetas positivas
para las dimensiones `depresion` y `ansiedad` en `unified_dataset.json`.

## Conteos esperados (dataset_stats.json)

| Dimensión | Positivos | Negativos | Total  |
| --------- | --------- | --------- | ------ |
| Suicidio  | ~2.407    | ~3.114    | ~5.521 |
| Depresión | ~400      | ~5.121    | ~5.521 |
| Ansiedad  | ~405      | ~5.116    | ~5.521 |

## Conteos actuales (con el error)

| Dimensión | Positivos     | Negativos |
| --------- | ------------- | --------- |
| Suicidio  | ~2.407        | ~3.114    |
| Depresión | **0** ← ERROR | ~5.521    |
| Ansiedad  | **0** ← ERROR | ~5.521    |

## Fuentes del dataset clínico

| Fuente                              | Dimensión cubierta | Tipo de anotación              |
| ----------------------------------- | ------------------ | ------------------------------ |
| MentalRiskES corpus raw (depresión) | Depresión          | Por sujeto (Weakly Supervised) |
| MentalRiskES corpus raw (ansiedad)  | Ansiedad           | Por sujeto (Weakly Supervised) |
| MentalRiskES Task 3                 | Suicidio           | Por mensaje                    |
| suicide-comments-es (filtrado)      | Suicidio           | Por mensaje                    |
| manual_anxiety                      | Ansiedad           | Manual (6 ejemplos)            |

## Acción requerida antes de fine-tuning

1. Corregir `prepare_datasets.py`: identificar por qué las etiquetas de depresión/ansiedad
   no se propagan desde los sources originales al dataset unificado.
2. Ejecutar script y verificar que los conteos coincidan con `dataset_stats.json`.
3. Solo entonces iniciar fine-tuning en Colab (ver `guia_fine_tuning.md`).

## Criterios de éxito del fine-tuning

| Dimensión | F1 mínimo en test set |
| --------- | --------------------- |
| Suicidio  | ≥ 0.70                |
| Depresión | ≥ 0.60                |
| Ansiedad  | ≥ 0.60                |
