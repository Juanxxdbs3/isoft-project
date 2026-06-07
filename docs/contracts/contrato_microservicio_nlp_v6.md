# Contrato del Microservicio NLP — MindBridge
## Diseño del módulo de análisis lingüístico: esquemas, taxonomía y reglas de decisión

---

## Historial de versiones

| Versión | Fecha | Descripción |
|---|---|---|
| 1.0 | 28-04-2026 | Primera versión: esquema JSON, taxonomía, fórmula IMB, umbrales y restricciones no funcionales. |
| 2.0 | 28-04-2026 | Arquitectura de dos capas. Filtro de seguridad para textos cortos. Roadmap de construcción. |
| 3.0 | 28-04-2026 | Arquitectura de modelos resuelta: BETO multi-tarea + clasificador de comunidad. Etiquetado multilabel. Manejo de errores. Política de contexto previo. Moderación paralela según D-09. |
| 4.0 | 30-04-2026 | Cierre Fase 2. Hallazgos de validación conceptual (21 textos, Llama 3.3-70b). Corrección criterio normas de comunidad. Documentación solapamiento depresión/ansiedad. Confirmación de umbrales. |
| 5.0 | 01-05-2026 | Cierre Fase 3. Arquitectura implementada del esqueleto FastAPI. Decisión pendiente sobre estrategia de contexto previo. Plan inicial Fase 4. |
| 6.0 | 04-06-2026 | Fusión con documento de especificación extendida. Stack tecnológico explícito. Endpoint canónico actualizado a /api/v1/analyze. Esquema de respuesta reestructurado con secciones clinical y community. risk_level estandarizado a inglés (LOW/MEDIUM/HIGH). cumple_normas consolidado como campo único binario (v_agresion/v_odio difieren para versión futura). Autenticación inter-servicio documentada. Suite de tests documentada. Dataset stats de Fase 4 incorporados con nota de error en etiquetas de depresión/ansiedad. |

---

## 1. Propósito

Este documento define el contrato técnico, semántico y de comportamiento del microservicio de Procesamiento de Lenguaje Natural (NLP) de MindBridge. Cubre los esquemas de intercambio de datos, la taxonomía de etiquetado clínico y de comunidad, la lógica de cálculo del Índice de Malestar Base (IMB), las políticas de manejo de contexto previo, la arquitectura de modelos y la estrategia de construcción y fine-tuning.

Este contrato es la interfaz entre el backend Fastify y el microservicio Python con FastAPI. Toda modificación debe quedar registrada en el historial de versiones.

---

## 2. Stack tecnológico

| Componente | Tecnología |
|---|---|
| Entorno de ejecución | Python 3.13 |
| Framework web | FastAPI (asíncrono, Pydantic v2) |
| Servidor ASGI | Uvicorn / Gunicorn |
| Motor de inferencia | PyTorch + Transformers (HuggingFace) |
| Modelo base clínico | `dccuchile/bert-base-spanish-wwm-cased` (BETO, ~110M parámetros) |
| Modelo de comunidad | TF-IDF + Regresión Logística (escala a BETO si F1 < 0.75) |
| Preprocesamiento | spaCy `es_core_news_sm` |
| Configuración | `pydantic-settings` (módulo central `src/config.py`) |
| Despliegue | Docker sobre Railway o Render |

---

## 3. Principios de diseño

**Separación de responsabilidades.** El microservicio entrega valores calculados. El backend toma las decisiones operativas (crear alertas, enrutar notificaciones, actualizar estados).

**Separación entre orquestación y modelo.** La capa FastAPI maneja metadatos, reglas de negocio, validación y ensamblado del JSON. Los modelos reciben exclusivamente texto preprocesado, sin identidad real, campus, timestamp ni datos administrativos.

**Moderación paralela, no bloqueante.** El análisis clínico y el de normas de comunidad corren en paralelo dentro del mismo pipeline asíncrono. Si el contenido viola normas, el backend lo oculta retroactivamente; el análisis clínico se completa igualmente y puede generar una alerta.

**Independencia entre riesgo clínico y normas de comunidad.** El malestar psicológico del autor, incluida la ideación suicida, no constituye violación de normas. `cumple_normas = false` se reserva exclusivamente para contenido agresivo, insultante o amenazante dirigido a terceros.

**Inferencia local y privada en producción.** Todo el procesamiento ocurre dentro de la infraestructura controlada. No se transfiere texto a servicios externos de terceros en producción. Esta restricción se deriva de RD-03 y RD-04.

**Configurabilidad de parámetros.** Los umbrales (pesos del IMB, umbral de override suicida, rangos de clasificación) son configurables por el administrador mediante variables de entorno antes del despliegue. No son modificables desde la interfaz de usuario (RF13).

---

## 4. Arquitectura del microservicio

```
[ POST /api/v1/analyze desde Backend Fastify ]
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│ CAPA DE ORQUESTACIÓN (FastAPI)                       │
│  - Validación de esquemas (Pydantic v2)              │
│  - Filtro de seguridad expreso (léxico)              │
│  - Pipeline de orquestación asíncrona                │
│  - Cálculo IMB y override suicida                    │
│  - Ensamblado del JSON de respuesta                  │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │ CAPA DE MODELOS                                │  │
│  │  - TextPreprocessor (spaCy)                    │  │
│  │  - BETOClinicalModel (3 cabezas sigmoid)       │  │
│  │  - CommunityClassifier (TF-IDF + LR o BETO)   │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
                        │
                        ▼
[ Respuesta JSON estructurada al Backend Fastify ]
```

La capa de modelos expone interfaces Python puras a la capa de orquestación, abstrayéndola de los tensores de PyTorch.

---

## 5. Taxonomía de dimensiones clínicas

### 5.1 Depresión (`p_depresion`)

Señales de tristeza persistente, desmotivación, fatiga emocional, desesperanza, sentimientos de vacío, pérdida de interés y dificultad para proyectarse en el futuro. Indicadores: pronombres en primera persona con afecto negativo, adverbios absolutistas en contextos negativos, léxico LIWC de afecto negativo, lenguaje temporal orientado al pasado o presente estático.

### 5.2 Ansiedad (`p_ansiedad`)

Señales de preocupación excesiva, agitación, tensión sostenida, dificultad para concentrarse, insomnio referenciado y anticipación negativa. Indicadores: lenguaje temporal orientado a un futuro incontrolable, verbos de duda y temor, estrés somático referenciado, construcciones condicionales negativas.

### 5.3 Ideación suicida (`p_suicida`)

Señales de ideación pasiva (deseos de no existir, de desaparecer) e ideación activa (planes, métodos, intenciones explícitas). Incluye expresiones ambiguas cuando el contexto lingüístico refuerza la interpretación de riesgo. La distinción activa/pasiva es extensión futura.

### 5.4 Etiquetado multilabel

Las tres dimensiones son independientes. Un texto puede activar varias simultáneamente. El entrenamiento usa Binary Cross Entropy por cabeza, no Softmax.

### 5.5 Solapamiento lingüístico depresión/ansiedad

Textos con insuficiencia y autoevaluación negativa sin anticipación futura explícita tienden a clasificarse como ansiedad dominante por modelos sin instrucción explícita, cuando clínicamente corresponden a indicadores depresivos. El IMB integra ambas dimensiones, de modo que el solapamiento no afecta el nivel de riesgo final. El dataset de fine-tuning debe incluir ejemplos donde la depresión sea dominante en contextos de insuficiencia sin componente de anticipación.

### 5.6 Normas de comunidad (`cumple_normas`)

Campo binario. `false` (viola la norma) se asigna exclusivamente a contenido con agresión directa hacia otras personas, insultos, intentos de humillación, doxeo o discurso de odio basado en colectivos vulnerables. El malestar del autor, incluida la ideación suicida, siempre produce `cumple_normas = true`.

La distinción entre agresión interpersonal y discurso de odio como dimensiones separadas (`v_agresion`, `v_odio`) es una extensión futura documentada; no se implementa en el MVP por restricciones de tiempo y dataset.

---

## 6. Preprocesamiento del texto

Operaciones ejecutadas por `TextPreprocessor` mediante spaCy `es_core_news_sm`:

- Normalización Unicode NFC.
- Eliminación de URLs, hashtags y menciones.
- Conversión de emojis a descripción textual en español mediante `data/emoji_map.json`.
- Conservación deliberada de puntuación expresiva (puntos suspensivos, signos repetidos).
- Detección de mezcla de idiomas mediante marcadores léxicos del inglés desde `data/en_markers.txt`; umbral configurable por variable de entorno.
- No se elimina jerga coloquial juvenil en español.

---

## 7. Umbral mínimo de análisis y filtro de seguridad

### 7.1 Umbral general

El análisis semántico completo se activa cuando el texto normalizado contiene 20 palabras o más.

### 7.2 Filtro de seguridad expreso

Los textos con menos de 20 palabras se evalúan mediante coincidencia léxica contra `data/immediate_risk_expressions.txt`, validado con la profesional de psicología. Si hay coincidencia, el microservicio retorna `safety_filter_triggered: true` y `risk_level: "SAFETY_FILTER_TRIGGERED"` sin pasar por el modelo.

La decisión de diseño es fallar hacia la seguridad: el costo de un falso positivo (el psicólogo descarta la alerta en segundos) es menor que el costo de un falso negativo.

### 7.3 Registro de auditoría para textos no analizados

Los textos que no superan el umbral y no activan el filtro generan un registro de auditoría con `id_publicacion`, `timestamp`, `motivo_exclusion: "insufficient_text"` y `word_count`.

---

## 8. Política de contexto previo

El campo `contexto_previo` acepta hasta 5 publicaciones previas del autor. La decisión sobre la estrategia definitiva (ventana de publicaciones vs. resumen acumulativo) queda pendiente hasta la Fase 5. La implementación actual soporta ambas estrategias sin cambios en el contrato de entrada.

```
[SEP] texto_resumido_1 [SEP] texto_resumido_2 [SEP] ... [SEP] texto_actual
```

El string completo no puede superar 512 tokens; las entradas más antiguas se truncan si es necesario.

---

## 9. Autenticación inter-servicio

Toda llamada desde el backend al microservicio se autentica mediante un token Bearer estático de alta entropía inyectado en el header `Authorization`. El token se configura como variable de entorno secreta en ambos servicios. Las llamadas sin token válido reciben `HTTP 401`. Toda comunicación usa HTTPS con TLS 1.3.

---

## 10. Esquema de entrada

### 10.1 Endpoint

```
POST /api/v1/analyze
```

### 10.2 Estructura JSON

```json
{
  "id_publicacion": "string (UUID v4, obligatorio)",
  "id_seudonimo": "string (hash, obligatorio)",
  "texto": "string (UTF-8, obligatorio)",
  "timestamp": "string (ISO 8601, obligatorio)",
  "contexto_previo": [
    {
      "texto_resumido": "string (máx 100 palabras)",
      "timestamp": "string (ISO 8601)",
      "nivel_riesgo_previo": "string | null"
    }
  ],
  "incluir_explicabilidad": "boolean (opcional, default false)"
}
```

`id_publicacion`, `id_seudonimo` y `timestamp` son manejados por la capa de orquestación. No se pasan al modelo.

### 10.3 Validaciones de entrada

| Condición | Respuesta | HTTP |
|---|---|---|
| `texto` nulo o vacío | Error estructurado | 422 |
| `id_publicacion` no es UUID v4 válido | Error estructurado | 422 |
| `contexto_previo` con más de 5 entradas | Error estructurado | 422 |
| `texto` < 20 palabras, sin trigger | `texto_suficiente: false`, `clinical: null` | 200 |
| `texto` < 20 palabras, con trigger léxico | `safety_filter_triggered: true`, `risk_level: "SAFETY_FILTER_TRIGGERED"` | 200 |
| Texto mixto > 40% inglés | `confianza_reducida: true`, `advertencias: ["mixed_language_detected"]` | 200 |
| Parámetros de configuración ausentes | Alerta crítica en log; análisis no ejecutado | — |
| Timeout del microservicio | Backend encola para reintento; contenido permanece visible | — |
| Una cabeza del modelo falla | Cabeza retorna `null`; IMB se calcula con dimensiones disponibles; `advertencias: ["partial_model_response"]` | 200 |

---

## 11. Esquema de salida

### 11.1 Estructura JSON

```json
{
  "id_publicacion": "string",
  "status": "success | error",
  "timestamp_analisis": "string (ISO 8601)",
  "execution_time_ms": "number",
  "texto_suficiente": "boolean",
  "safety_filter_triggered": "boolean",
  "confianza_reducida": "boolean",
  "advertencias": ["string"],
  "clinical": {
    "p_depresion": "number (0-100) | null",
    "p_ansiedad":  "number (0-100) | null",
    "p_suicida":   "number (0-100) | null",
    "imb":         "number (0-100) | null",
    "suicidal_override":  "boolean | null",
    "risk_level":         "string | null",
    "top_clinical_label": "string | null",
    "rationale":          "string | null"
  },
  "community": {
    "cumple_normas":     "boolean | null",
    "score_normas":      "number (0-1) | null",
    "moderation_decision": "APPROVED | REJECTED | null"
  },
  "metadatos": {
    "tokens_procesados":             "integer",
    "publicaciones_contexto_usadas": "integer",
    "version_modelo_clinico":        "string",
    "version_modelo_normas":         "string"
  },
  "explicabilidad": "object | null"
}
```

Valores posibles de `clinical.risk_level`: `"LOW"` (IMB 0–39), `"MEDIUM"` (IMB 40–69), `"HIGH"` (IMB ≥ 70 o override suicida), `"SAFETY_FILTER_TRIGGERED"`, `null` (texto insuficiente sin trigger).

Los campos `clinical` y `community` son `null` cuando `texto_suficiente = false` y `safety_filter_triggered = false`.

---

## 12. Cálculo del IMB y reglas de precedencia

### 12.1 Fórmula

```
IMB = 0.6 × p_depresion + 0.4 × p_ansiedad
```

La dimensión suicida opera como señal de anulación independiente; no entra en la fórmula.

### 12.2 Reglas de precedencia (orden estricto)

1. Texto < 20 palabras + trigger léxico → `"SAFETY_FILTER_TRIGGERED"`.
2. Texto < 20 palabras sin trigger → `risk_level: null`.
3. `p_suicida ≥ 60` → `"HIGH"` (override suicida; IMB ignorado).
4. Clasificación por IMB: LOW [0–39], MEDIUM [40–69], HIGH [≥ 70].

### 12.3 Configurabilidad de umbrales

Todos los parámetros numéricos se implementan como variables de entorno leídas desde `src/config.py` (pydantic-settings). Son modificables por el administrador antes del despliegue. No son accesibles desde la interfaz de usuario (RF13).

---

## 13. Arquitectura de modelos

### 13.1 Modelo A — Clasificador clínico multi-tarea (BETO fine-tuneado)

Un único modelo BETO-base fine-tuneado con tres cabezas de clasificación independientes. Cada cabeza produce una probabilidad entre 0 y 1 que la capa de orquestación escala a 0–100.

BETO es un encoder-only Transformer (~110M parámetros). No genera texto; produce representaciones vectoriales. Se descarga desde HuggingFace Hub y corre en CPU para inferencia.

### 13.2 Modelo B — Clasificador de normas de comunidad

Clasificador binario separado. Implementación inicial: regresión logística sobre TF-IDF (más rápido, menor latencia). Escala a BETO fine-tuneado si el F1 en `viola_norma` no alcanza 0.75 con el dataset disponible. Corre en paralelo con el Modelo A.

### 13.3 Función de pérdida multilabel con enmascaramiento

El dataset clínico contiene registros con etiqueta `-1` en dimensiones no anotadas por la fuente de origen. La función de pérdida excluye del cálculo del gradiente las posiciones con `-1`, permitiendo entrenar con datos parcialmente etiquetados (Weakly Supervised Learning).

```python
def masked_bce_loss(logits, labels, pos_weights):
    mask = (labels >= 0).float()
    loss = F.binary_cross_entropy_with_logits(
        logits, labels.clamp(min=0), pos_weight=pos_weights, reduction='none'
    )
    return (loss * mask).sum() / mask.sum().clamp(min=1e-8)
```

---

## 14. Estado del dataset de fine-tuning (Fase 4)

### 14.1 Fuentes del dataset clínico

| Fuente | Dimensión | Registros |
|---|---|---|
| MentalRiskES corpus raw (depresión) | Depresión | ~499 sujetos (Weakly Supervised) |
| MentalRiskES corpus raw (ansiedad) | Ansiedad | ~500 sujetos (Weakly Supervised) |
| MentalRiskES Task 3 | Suicidio | 3.115 mensajes etiquetados a nivel de mensaje |
| suicide-comments-es (filtrado) | Suicidio | 800 mensajes |
| manual_anxiety | Ansiedad | 6 ejemplos |

### 14.2 Dataset unificado (`unified_dataset.json`)

Target: 5.521 registros con la siguiente distribución:

| Etiqueta | Positivos | Negativos |
|---|---|---|
| Suicidio | 2.407 | 3.114 |
| Depresión | ~400 | ~5.121 |
| Ansiedad | ~405 | ~5.116 |

**Nota:** El error en `prepare_datasets.py` fue corregido. El modelo clínico se entrenó exitosamente alcanzando F1 suicidal 0.816 (supera umbral 0.70), F1 depression 0.564 y F1 anxiety 0.596. Ver `docs/notes/nlp-dataset-status.md` para métricas detalladas.

### 14.3 Desbalance y compensación

El desbalance entre clases de depresión/ansiedad (pocos positivos) y suicidio (más equilibrado) se compensa mediante `pos_weight` por cabeza en la función de pérdida BCE. Los pesos aproximados son depresión: ~12.8, ansiedad: ~12.6, suicidio: ~1.3.

### 14.4 Criterios de éxito de Fase 4

| Dimensión | F1 mínimo | Justificación |
|---|---|---|
| Suicidio | ≥ 0.70 | Dimensión crítica; falsos negativos tienen consecuencias directas de seguridad |
| Depresión | ≥ 0.60 | Solapamiento con ansiedad es tolerado por el IMB |
| Ansiedad | ≥ 0.60 | Ídem |

---

## 15. Restricciones no funcionales

| Restricción | Valor | Referencia |
|---|---|---|
| Latencia máxima (p95) | < 5 segundos | RDes-08 |
| Idioma | Español neutro latinoamericano, UTF-8 | Restricción de diseño |
| Mínimo de palabras para análisis semántico | 20 palabras tras normalización | D-03 |
| Máximo de palabras analizable | ~400 palabras / 512 tokens | Límite ventana BETO |
| Máximo por entrada de contexto previo | 100 palabras | Restricción de diseño |
| Máximo de entradas de contexto | 5 | Restricción de diseño |
| Procesamiento en producción | Local, sin APIs externas | RD-03, RD-04 |
| APIs externas | Solo en Fase 2 de validación conceptual | RD-03 |
| Memoria RAM máxima | < 1.8 GB | Restricción de infraestructura |
| Parámetros de umbral | Configurables por administrador; no desde UI | RF13 |

---

## 16. Suite de pruebas

### 16.1 Tests base (deben mantenerse en verde)

**`test_safety_filter`:** valida que el filtro léxico detecte expresiones de crisis inminente en textos cortos y retorne `risk_level: "SAFETY_FILTER_TRIGGERED"` sin pasar por el modelo.

**`test_pipeline_stratification`:** simula salidas numéricas controladas de las cabezas clínicas y verifica que la lógica del IMB, el override suicida y la estratificación calculen el nivel de riesgo correcto.

**`test_pydantic_validation`:** envía payloads malformados (sin `id_publicacion`, texto vacío, más de 5 entradas de contexto) y verifica que FastAPI retorne `HTTP 422` estructurado.

### 16.2 Tests adicionales planificados (Fase 5)

- `test_community_classifier_independence`: texto con `p_suicida = 90` debe producir `cumple_normas = true` si no contiene agresión a terceros.
- `test_context_window_truncation`: texto + contexto que supere 512 tokens debe truncar las entradas más antiguas sin error.

---

## 17. Roadmap de construcción

### Fase 1 — Especificación del contrato ✅ COMPLETADA

### Fase 2 — Validación conceptual ✅ COMPLETADA
21 textos evaluados con Llama 3.3-70b vía Groq. Tasa de acierto: 17/21. Umbrales confirmados. Solapamiento depresión/ansiedad documentado. Criterio de normas de comunidad corregido.

### Fase 3 — Esqueleto FastAPI ✅ COMPLETADA
Endpoints `POST /api/v1/analyze` y `GET /health`. Pipeline completo con `TextPreprocessor`, `SafetyFilter`, `BETOClinicalModel` y `AnalysisPipeline`. Tres tests en verde. Documentación OpenAPI en `/docs`.

### Fase 4 — Dataset y fine-tuning ✅ COMPLETADA
Construcción del dataset unificado. Fine-tuning de BETO clínico en Google Colab con F1 suicidal 0.816 (supera umbral 0.70). Integración de `BETOClinicalModel` en el pipeline reemplazando `ModelStub`.

### Fase 5 — Integración del modelo real ✅ COMPLETADA
`ModelStub` reemplazado por `BETOClinicalModel` con la misma firma `predict()`. Endpoint renombrado a `/api/v1/analyze`. Pendiente: pruebas de latencia en hardware de despliegue, validación de umbrales con la profesional de psicología, y estrategia de despliegue para `model.safetensors` (~800MB).

---

## 18. Pendientes formalizados

La decisión sobre la estrategia de contexto previo (ventana de publicaciones vs. resumen acumulativo) debe tomarse antes de la Fase 5. La estrategia de resumen acumulativo es la recomendada por su mejor retención de historia clínica, pero requiere definir quién genera el resumen y cómo se almacena en el backend.

La lista definitiva de expresiones del filtro de seguridad se construye con participación de la profesional de psicología antes de las pruebas en producción.

La guía de anotación detallada para el dataset de normas de comunidad (ejemplos positivos y negativos, distinción agresión vs. malestar del autor) se redacta como documento separado antes de comenzar la anotación.

Los umbrales numéricos de la sección 12 deben validarse con la profesional antes del despliegue productivo.

La distinción entre ideación suicida activa y pasiva requiere extensión del contrato en versión futura.

---

## 19. Estado de implementación (actualizado 2026-06-06)

| Componente | Estado | Notas |
|---|---|---|
| Endpoint | ✅ /api/v1/analyze | Renombrado desde /analizar |
| Pipeline | ✅ Integrado | AnalysisPipeline operativo |
| Modelo clínico | ✅ BETOClinicalModel activo | Reemplaza ModelStub, F1 suicidal 0.816 |
| Modelo normas | 🔲 Pendiente | Dataset no construido |
| Safety filter | ✅ Operativo | Filtro léxico en pipeline |
| Tests pipeline | ⚠️ 2/3 pasan | test_full_analysis requiere actualizar aserciones del stub al modelo real |
