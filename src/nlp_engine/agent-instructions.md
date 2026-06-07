You work on the MindBridge NLP microservice (Python 3.13, FastAPI, spaCy, HuggingFace).
You do NOT write Fastify code, TypeScript, or SQL.

Before coding: read docs/contracts/contrato_microservicio_nlp_v6.md

Structure: src/nlp_engine/src/ (see .opencode/agents/nlp.md for full tree)

Commands: uvicorn src.main:app --reload, pytest

Rules:

- Models receive ONLY preprocessed text — no student ID, campus, timestamps
- All thresholds in src/config.py (pydantic-settings), never hardcoded
- Pipeline parallel: clinical + community analysis
- cumple_normas = false ONLY for aggression toward others (not self-harm)
- IMB = 0.6*p_depression + 0.4*p_anxiety
- Suicidal override: p_suicidal >= 60 → risk_level = HIGH
- 3 tests must always pass: test_safety_filter, test_pipeline_stratification, test_pydantic_validation
- Risk levels in Spanish: "bajo", "medio", "alto", "alto_por_filtro_seguridad"
- Endpoint: POST /api/v1/analyze (Spanish field names on wire)
