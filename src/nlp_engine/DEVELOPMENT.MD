# NLP Engine — MindBridge

Python 3.13, FastAPI, spaCy, HuggingFace (BETO)

## Structure

```
src/nlp_engine/
├── src/
│   ├── __init__.py
│   ├── main.py                          # FastAPI app
│   ├── config.py                        # pydantic-settings central
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── health.py
│   │   └── analysis.py                  # POST /analizar
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── request.py                   # AnalysisRequest (Pydantic v2)
│   │   └── response.py                  # AnalysisResponse
│   ├── orchestration/
│   │   ├── __init__.py
│   │   ├── pipeline.py                  # AnalysisPipeline
│   │   ├── preprocessor.py              # TextPreprocessor (spaCy)
│   │   └── safety_filter.py             # SafetyFilter
│   ├── models/
│   │   └── clinical_model_v1/           # BETO fine-tuned checkpoint
│   │       ├── model.safetensors
│   │       ├── config.json
│   │       ├── tokenizer.json
│   │       ├── training_metadata.json
│   │       └── clinical.py                     # BETOClinicalModel (real model, replaces stub)
│   └── stubs/
│       ├── __init__.py
│       └── model_stub.py                # ModelStub (mock)
├── tests/
│   ├── __pycache__/                     # Ignorado por git
│   ├── conftest.py
│   └── test_pipeline.py                 # 3 tests obligatorios
├── data/
│   ├── emoji_map.json
│   ├── immediate_risk_expressions.txt
│   └── en_markers.txt
├── data_collection/
│   ├── cleaned/
│   ├── raw/
│   ├── sources/
│   ├── prepare_datasets.py
│   └── build_training_dataset.py
├── notebooks/
├── .vscode/
├── requirements.txt
├── .env
├── .env.example
└── .gitignore
```

## Commands

```
uvicorn src.main:app --reload           # Dev server (port 8000)
pytest                                   # Run all tests
```

## Python environment

The project uses a venv with Python 3.13.3. To activate:

  # Windows (PowerShell)
  .venv\Scripts\Activate.ps1

  # Linux/macOS  
  source .venv/bin/activate

The venv is not committed to the repository.

## Tests that must always pass

- `test_safety_filter` — text under min word count with trigger phrases → high risk
- `test_pipeline_stratification` — controlled numeric inputs → correct `risk_level`
- `test_pydantic_validation` — malformed payloads → HTTP 422

## State

Fase 3 ✅ completa (esqueleto + stub). Modelo clínico entrenado pero no integrado.
Blockers activos: ver `docs/notes/blockers.md`.

## Dependencies

The real model requires `torch` and `transformers`. Installed in the venv:
```
pip install torch transformers
```

## Tests

One test (`test_full_analysis_returns_valid_response`) currently fails because it was written with hardcoded stub expectations. The model correctly predicts higher scores for the test text. The other two tests pass:
- `test_short_text_returns_insufficient_response` ✅
- `test_short_text_with_risk_expression_activates_safety_filter` ✅
