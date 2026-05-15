# Contrato del Microservicio NLP — MindBridge
## Diseño del módulo de análisis lingüístico: esquemas, taxonomía y reglas de decisión

---

## Historial de versiones

| Versión | Fecha | Descripción |
|---|---|---|
| 1.0 | 28-04-2026 | Primera versión del contrato: esquema JSON, taxonomía, fórmula IMB, umbrales y restricciones no funcionales. |
| 2.0 | 28-04-2026 | Arquitectura de dos capas (orquestación / modelo). Filtro de seguridad para textos cortos. Roadmap de construcción. Restricción de procesamiento local en producción. |
| 3.0 | 28-04-2026 | Arquitectura de modelos resuelta: un BETO multi-tarea (3 cabezas clínicas) + clasificador liviano para normas de comunidad. Etiquetado multilabel. Manejo de errores y casos límite. Política de contexto previo detallada. Estrategia de anotación. Pipeline corregido según D-09 (moderación retroactiva). Moderación paralela al análisis clínico, no como filtro previo bloqueante. |
| 4.0 | 30-04-2026 | Cierre formal de la Fase 2 del roadmap. Incorporación de hallazgos de validación conceptual (21 textos, modelo Llama 3.3-70b vía Groq). Corrección de criterio de normas de comunidad: el malestar del autor no constituye infracción. Documentación de zona de solapamiento lingüístico depresión/ansiedad. Confirmación de umbrales. Nota de configurabilidad de parámetros alineada con RF13. Corrección menor en criterio de `top_clinical_label` para casos de score cero. |
| 5.0 | 01-05-2026 | Cierre formal de la Fase 3. Documentación de la arquitectura implementada del esqueleto FastAPI. Decisión pendiente formalizada sobre estrategia de contexto previo (resumen acumulativo vs. ventana de publicaciones). Justificación documentada del comportamiento del filtro de seguridad en textos cortos con contexto condicional. Plan inicial de la Fase 4. Consideraciones para la Fase 5. |

---

## 1. Propósito

Este documento define el contrato de interfaz del microservicio de Procesamiento de Lenguaje Natural (NLP) de MindBridge. El microservicio es un componente especializado e independiente responsable de analizar el texto producido por los estudiantes en el foro y devolver una evaluación estructurada del malestar psicológico inferido y del cumplimiento de las normas de comunidad.

La especificación cubre los esquemas de entrada y salida, la taxonomía de dimensiones clínicas, los criterios de cálculo del Índice de Malestar Base (IMB), los umbrales de clasificación, las reglas de precedencia, la arquitectura de modelos, la política de contexto previo, la estrategia de etiquetado y entrenamiento, el manejo de errores y las restricciones no funcionales.

Este contrato es la interfaz entre la capa de negocio del backend Fastify y el microservicio Python con FastAPI. Toda modificación debe quedar registrada en el historial de versiones con justificación, dado que afecta directamente la lógica de alertas y el panel del psicólogo.

---

## 2. Principios de diseño del contrato

**Separación de responsabilidades.** El microservicio NLP no genera alertas, no envía notificaciones ni decide a qué psicólogo enrutar el caso. Entrega valores calculados y el backend toma las decisiones operativas a partir de esos valores.

**Separación entre orquestación y modelo.** El microservicio opera en dos capas internas: la capa de orquestación (FastAPI) maneja metadatos, reglas de negocio, validación y ensamblado del JSON; la capa del modelo recibe exclusivamente texto preprocesado. Los modelos no reciben identidad real, sede, timestamp ni ningún otro dato administrativo. Esta separación permite reemplazar el modelo subyacente sin modificar el contrato externo.

**Moderación paralela, no bloqueante del análisis clínico.** De acuerdo con D-09, la publicación se hace visible de forma inmediata y la moderación actúa de forma retroactiva. El análisis de normas de comunidad y el análisis clínico corren en paralelo dentro del mismo pipeline asíncrono. Si el contenido viola normas, se oculta retroactivamente; el análisis clínico se completa igualmente y puede generar una alerta, porque el riesgo psicológico del autor es independiente de si el texto cumple las normas de comunidad.

**Independencia entre riesgo clínico y normas de comunidad.** El malestar psicológico del autor —incluyendo ideación suicida— no constituye violación de las normas de comunidad. La evaluación de `cumple_normas` se aplica exclusivamente a contenido agresivo, insultante o amenazante dirigido a terceros. Un texto con `p_suicida=90` debe producir `cumple_normas=true` si no agrede a otras personas. Este principio fue validado en la Fase 2 y es una corrección respecto a comportamientos observados en modelos de propósito general sin instrucción explícita.

**Estabilidad del contrato.** Los campos del esquema JSON de salida no pueden eliminarse sin coordinar un cambio de versión mayor. Pueden añadirse campos nuevos con valores por defecto sin romper la compatibilidad.

**Inferencia local y privada en producción.** Todo el procesamiento ocurre dentro de la infraestructura controlada por el sistema. No se transfiere texto a servicios externos de terceros en el entorno productivo. Esta restricción se deriva de RD-03 y RD-04. El uso de APIs externas (Groq, OpenAI, etc.) queda restringido a la Fase 2 del roadmap de validación conceptual.

**Configurabilidad de parámetros.** Los umbrales de cálculo (pesos del IMB, umbral de override suicida, rangos de clasificación) son configurables por el administrador del sistema mediante variables de entorno antes del despliegue. No son modificables desde la interfaz de usuario en la versión actual, de acuerdo con RF13.

---

## 3. Arquitectura de modelos

### 3.1 Decisión de arquitectura

**Modelo A — Clasificador clínico multi-tarea (BETO fine-tuneado):** Un único modelo BETO-base fine-tuneado con tres cabezas de clasificación independientes, una por cada dimensión clínica: depresión, ansiedad y suicidio. El modelo realiza clasificación multilabel: las tres dimensiones son independientes y pueden estar activas simultáneamente. Cada cabeza produce un valor de probabilidad entre 0 y 1 que la capa de orquestación escala a 0–100.

**Modelo B — Clasificador de normas de comunidad:** Un clasificador binario separado, inicialmente implementado como un modelo ligero (regresión logística o SVM sobre TF-IDF, o BETO fine-tuneado si los datos lo requieren). Produce una probabilidad de incumplimiento de normas que la capa de orquestación convierte en el valor booleano `cumple_normas`. Corre en paralelo con el Modelo A. Su entrenamiento debe incluir ejemplos que distingan explícitamente entre contenido agresivo hacia terceros (infracción) e ideación suicida o malestar del autor (no infracción).

**Justificación de la separación:** Un único modelo multi-tarea con tres cabezas clínicas reduce el tiempo de inferencia a una sola pasada, en lugar de las 4–8 segundos que producirían cuatro modelos BETO independientes. La tarea de normas de comunidad es cualitativamente distinta y se beneficia de un modelo especializado más ligero.

### 3.2 BETO como encoder, no como LLM

BETO (`dccuchile/bert-base-spanish-wwm-cased`) es un modelo de arquitectura Transformer encoder-only, con aproximadamente 110M de parámetros. No genera texto — produce representaciones vectoriales del texto de entrada. No requiere un LLM para funcionar. Se descarga directamente desde HuggingFace Hub y corre en CPU para inferencia dentro del límite de latencia de RDes-08. El fine-tuning se realiza en GPU (Google Colab T4) y el modelo serializado se carga en el servidor de producción para inferencia en CPU.

### 3.3 Estrategia de entrenamiento

El preentrenamiento de BETO ya fue realizado por el IIC de Chile. El trabajo del equipo consiste en fine-tuning supervisado: ajustar los pesos sobre un dataset etiquetado específico para las tres dimensiones clínicas del sistema. La biblioteca estándar es HuggingFace `transformers` con PyTorch.

---

## 4. Taxonomía de dimensiones clínicas

### 4.1 Dimensión depresiva (`p_depresion`)

Captura señales de tristeza persistente, desmotivación, fatiga emocional, desesperanza, sentimientos de vacío, pérdida de interés y dificultad para proyectarse en el futuro. Indicadores primarios: pronombres en primera persona con afecto negativo, adverbios absolutistas en contextos negativos, léxico de afecto negativo (LIWC), lenguaje temporal orientado al pasado o presente estático, ausencia de expectativa futura.

### 4.2 Dimensión ansiosa (`p_ansiedad`)

Captura señales de preocupación excesiva, agitación, tensión sostenida, dificultad para concentrarse, insomnio referenciado y anticipación negativa. Indicadores primarios: lenguaje temporal orientado a un futuro incontrolable, verbos de duda y temor, estrés somático referenciado, construcciones condicionales negativas.

### 4.3 Dimensión suicida (`p_suicida`)

Captura señales de ideación pasiva (deseos de no existir, de desaparecer) e ideación activa (planes, métodos, intenciones explícitas). Incluye expresiones ambiguas cuando el contexto lingüístico refuerza la interpretación de riesgo. La distinción entre ideación activa y pasiva es una extensión futura no contemplada en la puntuación numérica actual.

### 4.4 Etiquetado multilabel

Las tres dimensiones son independientes. Un mismo texto puede activar varias simultáneamente. El entrenamiento usa Binary Cross Entropy por cabeza, no Softmax sobre categorías mutuamente excluyentes.

### 4.5 Zona de solapamiento lingüístico depresión/ansiedad

Textos con insuficiencia y autoevaluación negativa sin anticipación futura explícita tienden a clasificarse como ansiedad dominante por modelos de propósito general, cuando clínicamente corresponden a indicadores depresivos. Este solapamiento no afecta el nivel de riesgo final porque el IMB integra ambas dimensiones. Orienta la estrategia de anotación de la Fase 4: el dataset debe incluir ejemplos donde la depresión sea dominante en contextos de insuficiencia sin componente de anticipación.

---

## 5. Preprocesamiento del texto

El texto pasa por las siguientes operaciones antes de llegar a los modelos, ejecutadas mediante spaCy con `es_core_news_sm`:

Normalización Unicode NFC. Eliminación de URLs (incluyendo rutas con IP, localhost y protocolos no-HTTP), hashtags y menciones. Conversión de emojis a descripción textual en español según mapa configurable (`emoji_map.json`); emojis sin mapeo se eliminan. Conservación deliberada de puntuación expresiva (puntos suspensivos, signos repetidos). Detección de mezcla de idiomas mediante marcadores léxicos del inglés cargados desde archivo configurable (`en_markers.txt`); el umbral de detección es configurable por variable de entorno.

El preprocesamiento no elimina jerga coloquial juvenil en español.

---

## 6. Umbral mínimo de análisis y filtro de seguridad

### 6.1 Umbral general

El análisis semántico completo se activa cuando el texto normalizado contiene 20 palabras o más. Los textos por debajo de este umbral no son procesados por los modelos.

### 6.2 Filtro de seguridad para textos cortos

Los textos con menos de 20 palabras se evalúan mediante coincidencia léxica contra una lista de expresiones de riesgo inmediato (`immediate_risk_expressions.txt`), mantenida versionada y validada por la profesional de psicología. Si hay coincidencia, el microservicio retorna `nivel_riesgo: "alto_por_filtro_seguridad"`, `filtro_seguridad_activado: true` y `texto_suficiente: false`.

**Justificación del comportamiento con expresiones condicionales.** Una expresión como "me voy a hacer daño" puede aparecer en contexto condicional ("si sigo así, me voy a hacer daño") que no implica intención directa. El filtro de seguridad aplica exclusivamente a textos cortos — insuficientes para que el modelo evalúe contexto. En ese escenario, la decisión de diseño es fallar hacia la seguridad: el costo de un falso positivo (el psicólogo descarta una alerta en segundos) es menor que el costo de un falso negativo. Para textos de 20 palabras o más, el modelo evalúa el contexto completo y el filtro léxico no interviene.

### 6.3 Sensibilidad residual en textos neutros

Textos neutros con referencias a plazos o incertidumbre menor pueden producir scores bajos no nulos (por ejemplo `p_ansiedad=20`). El IMB resultante clasifica en rango BAJO (< 40), sin generar alertas. Este comportamiento es esperado: la estratificación por IMB absorbe la sensibilidad residual sin producir falsas alarmas operativas.

### 6.4 Registro de auditoría para textos no analizados

Los textos que no superen el umbral y no activen el filtro generan un registro de auditoría mínimo con `id_publicacion`, `timestamp`, `motivo_exclusion: "texto_insuficiente"` y `cantidad_palabras`.

---

## 7. Política de contexto previo

### 7.1 Decisión pendiente: ventana de publicaciones vs. resumen acumulativo

El contrato actual especifica una ventana de hasta 5 publicaciones previas enviadas como entradas separadas. Durante la Fase 3 se identificó una estrategia alternativa arquitectónicamente más sólida: **resumen acumulativo único**, donde el backend mantiene un único documento de contexto por estudiante que se actualiza con cada nueva publicación, y el NLP siempre recibe exactamente dos inputs — el contexto acumulado y el texto actual.

Las ventajas del resumen acumulativo son la retención de historia más allá de las últimas 5 publicaciones y la reducción del espacio de tokens necesario. La desventaja es que introduce una responsabilidad nueva en el backend: generar, mantener y almacenar ese documento de contexto por estudiante.

Esta decisión queda pendiente hasta la Fase 4. La implementación actual soporta ambas estrategias sin cambios en el contrato de entrada. El campo `contexto_previo` puede recibir entre 0 y 5 entradas independientemente de la estrategia que adopte el backend.

### 7.2 Construcción del input del modelo

```
[SEP] texto_resumido_1 [SEP] texto_resumido_2 [SEP] ... [SEP] texto_actual
```

El separador `[SEP]` es el token nativo del tokenizador BETO. Los textos de contexto se incluyen en orden cronológico. El string completo no puede superar 512 tokens; las entradas más antiguas se truncan si es necesario.

### 7.3 Cuándo se usa contexto

Cuando `contexto_previo` contiene al menos una entrada válida. Si está vacío o ausente, el análisis opera sobre el texto actual en aislado.

---

## 8. Esquema de entrada

### 8.1 Estructura JSON

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

### 8.2 Validaciones de entrada

| Condición | Respuesta | HTTP |
|---|---|---|
| `texto` nulo o vacío | Error estructurado | 422 |
| `id_publicacion` no es UUID v4 válido | Error estructurado | 422 |
| `contexto_previo` con más de 5 entradas | Error estructurado | 422 |
| `texto` < 20 palabras, sin trigger | `texto_suficiente: false`, `nivel_riesgo: null` | 200 |
| `texto` < 20 palabras, con trigger | `filtro_seguridad_activado: true`, `nivel_riesgo: "alto_por_filtro_seguridad"` | 200 |
| Texto mixto > 40% inglés | `confianza_reducida: true`, `advertencias: ["texto_mixto_detectado"]` | 200 |
| Parámetros de configuración ausentes | Alerta crítica en log; análisis no ejecutado | — |
| Timeout del microservicio | Backend encola para reintento; contenido permanece visible | — |
| Una cabeza del modelo falla | Cabeza fallida retorna `null`; IMB se calcula con dimensiones disponibles; `advertencias: ["respuesta_parcial_modelo"]` | 200 |

---

## 9. Esquema de salida

### 9.1 Estructura JSON

```json
{
  "id_publicacion": "string",
  "id_seudonimo": "string",
  "timestamp_analisis": "string (ISO 8601)",
  "texto_suficiente": "boolean",
  "filtro_seguridad_activado": "boolean",
  "confianza_reducida": "boolean",
  "advertencias": ["string"],
  "dimensiones": {
    "p_depresion": "number (0-100) | null",
    "p_ansiedad": "number (0-100) | null",
    "p_suicida": "number (0-100) | null"
  },
  "imb": "number (0-100) | null",
  "override_suicida": "boolean | null",
  "nivel_riesgo": "string | null",
  "cumple_normas": "boolean | null",
  "score_normas": "number (0-1) | null",
  "metadatos": {
    "tokens_procesados": "integer",
    "publicaciones_contexto_usadas": "integer",
    "version_modelo_clinico": "string",
    "version_modelo_normas": "string"
  },
  "explicabilidad": "object | null"
}
```

Valores posibles de `nivel_riesgo`: `"bajo"` (IMB 0–39), `"medio"` (IMB 40–69), `"alto"` (IMB ≥ 70 o override suicida), `"alto_por_filtro_seguridad"`, `null`.

---

## 10. Cálculo del IMB y reglas de precedencia

### 10.1 Fórmula

```
IMB = 0.6 × p_depresion + 0.4 × p_ansiedad
```

La dimensión suicida opera como señal de anulación independiente, no entra en la fórmula.

### 10.2 Reglas de precedencia (orden estricto)

1. Si el texto tiene menos de 20 palabras y activa el filtro léxico → `"alto_por_filtro_seguridad"`.
2. Si el texto tiene menos de 20 palabras y no activa el filtro → `nivel_riesgo: null`.
3. Si `p_suicida ≥ 60` → `"alto"` (override suicida).
4. Clasificación por IMB: BAJO [0–39], MEDIO [40–69], ALTO [≥70].

### 10.3 Configurabilidad de umbrales

Todos los parámetros numéricos (pesos IMB, umbral override suicida, rangos de clasificación) se implementan como variables de entorno. Son modificables por el administrador antes del despliegue. No son accesibles desde la interfaz de usuario (RF13). Su ajuste definitivo se realiza en la Fase 5 con validación clínica.

### 10.4 Independencia entre riesgo clínico y normas de comunidad

El nivel de riesgo y `cumple_normas` son resultados independientes gestionados por separado en el backend. La ideación suicida no implica violación de normas de comunidad.

---

## 11. Estrategia de anotación del dataset

### 11.1 Tipo de problema

Clasificación multilabel supervisada. Tres clases: depresión, ansiedad, suicidio. No mutuamente excluyentes.

### 11.2 Estructura del registro de dataset

```json
{
  "id": "string",
  "texto": "string",
  "fuente": "string",
  "labels": { "depresion": 0, "ansiedad": 0, "suicida": 0 },
  "anotador_1": { "depresion": 0, "ansiedad": 0, "suicida": 0 },
  "anotador_2": { "depresion": 0, "ansiedad": 0, "suicida": 0 },
  "acuerdo": true,
  "notas": "string"
}
```

### 11.3 Proceso de anotación

Dos miembros del equipo anotan de forma independiente. Objetivo mínimo de acuerdo inter-anotador: κ ≥ 0.60 por dimensión (Kappa de Cohen). La profesional de psicología revisa entre 50 y 100 ejemplos. Los desacuerdos se resuelven a favor del criterio clínico.

### 11.4 Fuentes de datos

Reddit en español (comunidades de salud mental, anonimizados mediante PRAW), SetembroBR adaptado por traducción y revisión manual, textos sintéticos construidos por el equipo para balancear clases subrepresentadas. Mínimo 200 ejemplos anotados por clase para un primer fine-tuning evaluable.

### 11.5 Casos ambiguos

Los casos sin acuerdo inter-anotador se excluyen del entrenamiento inicial. La profesional los revisa en segunda ronda.

---

## 12. Trazabilidad y explicabilidad

Campos mínimos persistidos: `id_publicacion`, `timestamp_analisis`, `version_modelo_clinico`, `version_modelo_normas`, `override_suicida`, `filtro_seguridad_activado`.

El bloque `explicabilidad` es opcional y no requerido en el MVP:

```json
"explicabilidad": {
  "metodo": "attention",
  "fragmentos": [
    { "texto": "ojalá pudiera desaparecer", "peso": 0.82, "dimension": "p_suicida" }
  ]
}
```

---

## 13. Restricciones no funcionales

| Restricción | Valor | Referencia |
|---|---|---|
| Latencia máxima | < 5 segundos bajo carga normal | RDes-08 |
| Idioma | Español neutro latinoamericano, UTF-8 | Restricción de diseño |
| Mínimo de palabras para análisis semántico | 20 palabras tras normalización | D-03 |
| Máximo de palabras analizable | ~400 palabras / 512 tokens | Límite ventana BETO |
| Máximo por entrada de contexto previo | 100 palabras | Restricción de diseño |
| Máximo de entradas de contexto | 5 | Restricción de diseño |
| Procesamiento en producción | Local, sin APIs externas | RD-03, RD-04 |
| APIs externas | Solo en Fase 2 de validación conceptual | RD-03 |
| Parámetros de umbral | Configurables por administrador vía variables de entorno; no desde UI | RF13 |

---

## 14. Ambiente de entrenamiento

El fine-tuning de BETO-base requiere GPU. Las opciones viables son Google Colab (GPU T4 gratuita, suficiente para hasta 1.000 ejemplos en menos de 2 horas) y Kaggle Notebooks (GPU T4 o P100). Se recomienda Colab Pro para sesiones más largas y menor riesgo de interrupción. El modelo entrenado se serializa con `save_pretrained()` y se carga en el servidor de producción para inferencia en CPU. La inferencia en CPU toma entre 1 y 4 segundos por solicitud — compatible con RDes-08.

---

## 15. Roadmap de construcción

### Fase 1 — Especificación del contrato ✅ COMPLETADA
Esquema JSON, taxonomía, IMB, umbrales, arquitectura de modelos y restricciones.

### Fase 2 — Validación conceptual ✅ COMPLETADA
21 textos en español evaluados con Llama 3.3-70b vía Groq. Tasa de acierto clínico: 17/21. Hallazgos: umbrales confirmados, solapamiento depresión/ansiedad documentado, corrección del criterio de normas de comunidad (ideación suicida ≠ infracción), corrección del bug de `top_clinical_label` en casos de score cero.

### Fase 3 — Esqueleto FastAPI ✅ COMPLETADA
Microservicio Python implementado con FastAPI. Estructura de carpetas, endpoint `POST /analizar`, endpoint `GET /health`, capa de orquestación completa (validación, preprocesamiento con spaCy, filtro de seguridad, cálculo IMB, override suicida, ensamblado de respuesta), stub del modelo con valores configurables por variable de entorno, documentación OpenAPI generada automáticamente en `/docs`. Tres tests automatizados en verde. El backend puede integrarse y verificar el contrato antes de que el modelo real esté disponible.

**Decisiones de implementación adoptadas en Fase 3:**
- Parámetros de configuración centralizados en `src/config.py` con `pydantic-settings`. Sin `os.getenv()` dispersos.
- Listas de strings configurables en archivos `.txt` (expresiones de riesgo, marcadores de inglés). Mapas clave-valor en `.json` (emojis).
- El stub implementa la misma firma de `predict` que tendrá el modelo real, lo que permite sustituirlo en Fase 5 sin modificar el pipeline.
- Módulos con responsabilidad única: `TextPreprocessor`, `SafetyFilter`, `ModelStub`, `AnalysisPipeline` operan de forma independiente y se comunican por contratos de tipos.

### Fase 4 — Dataset y fine-tuning 🔲 PLANIFICADA
Ver sección 16.

### Fase 5 — Integración del modelo real 🔲 PENDIENTE
Reemplazo del stub por `ModelBeto` con la misma firma de `predict`. Pruebas de latencia en hardware de despliegue. Validación de umbrales con la profesional de psicología. Actualización de `CLINICAL_MODEL_VERSION` y `NORMS_MODEL_VERSION` en variables de entorno. Documentación del modelo desplegado.

---

## 16. Plan inicial de la Fase 4

### 16.1 Tareas del equipo (sin herramientas de código)

- Descargar textos de Reddit en español usando PRAW desde subreddits de salud mental. Volumen objetivo: 300–500 posts anonimizados.
- Instalar Label Studio de forma local y configurar el esquema de anotación con las tres etiquetas multilabel.
- Anotar el dataset en dos rondas independientes por dos miembros del equipo.
- Solicitar a la profesional de psicología la revisión de 50–100 ejemplos, con énfasis en casos del solapamiento depresión/ansiedad documentado en la sección 4.5.
- Construir textos sintéticos adicionales si la clase suicida queda subrepresentada.

### 16.2 Tareas de implementación (sesiones de desarrollo)

- Definir la estructura de carpetas del notebook de Colab y la estrategia de checkpoints en Google Drive.
- Escribir el script de descarga y anonimización de Reddit con PRAW.
- Escribir el script de conversión de Label Studio export a formato de entrenamiento JSON.
- Implementar el notebook de fine-tuning: carga de BETO, definición de las tres cabezas de clasificación, función de pérdida multilabel (BCE por cabeza), entrenamiento, evaluación con F1 por clase y AUC-ROC.
- Documentar las métricas obtenidas y los hiperparámetros utilizados.

### 16.3 Criterio de éxito de la Fase 4

El modelo fine-tuneado debe producir F1 ≥ 0.70 en la dimensión suicida sobre el conjunto de validación. Las dimensiones depresiva y ansiosa son secundarias en este criterio porque el solapamiento entre ellas es tolerado por el IMB. Un F1 de 0.60 en depresión y ansiedad es aceptable para el MVP.

---

## 17. Pendientes formalizados

La decisión sobre la estrategia de contexto previo (ventana de publicaciones vs. resumen acumulativo) debe tomarse antes de la Fase 5. La estrategia de resumen acumulativo es la recomendada por su mejor retención de historia clínica, pero requiere definir quién genera el resumen y cómo se almacena en el backend.

La lista definitiva de expresiones del filtro de seguridad se construye en la Fase 4 con participación de la profesional de psicología.

La guía de anotación detallada (ejemplos positivos y negativos por dimensión, incluyendo el solapamiento de la sección 4.5) se redacta como documento separado antes de comenzar la anotación.

La distinción entre ideación suicida activa y pasiva dentro de `p_suicida` requiere extensión del contrato en versión futura.

Los umbrales numéricos de la sección 10 deben validarse con la profesional antes del despliegue productivo.
