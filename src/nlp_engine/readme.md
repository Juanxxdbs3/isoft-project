# MindBridge NLP Engine

Microservicio de análisis lingüístico para detección de señales de riesgo 
psicológico en publicaciones del foro MindBridge.

## Stack
- Python 3.13
- FastAPI + Uvicorn
- spaCy (es_core_news_sm)
- Pydantic v2

## Setup

```bash
python -m venv .venv
.venv\Scripts\Activate.ps1       # Windows
pip install -r requirements.txt
python -m spacy download es_core_news_sm
```

## Configuración
Copia `.env.example` a `.env` y ajusta los valores. 
Los parámetros clínicos (pesos IMB, umbrales) son configurables por el administrador 
antes del despliegue, aunque es recomendable dejar los predeterminados a menos que haya una razón para cambiar el criterio de evaluación numérica.

## Levantar el servidor

```bash
uvicorn src.main:app --reload
```

Documentación interactiva: http://localhost:8000/docs

## Correr tests

```bash
pytest tests/ -v
```

## Estado actual
Fase 3 completada — stub activo. El modelo BETO real se integra en Fase 5.
Contrato completo: ver `contrato_microservicio_nlp_v4.md` en Documentación.