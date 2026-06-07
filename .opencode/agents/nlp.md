---
description: Implements the FastAPI NLP microservice for MindBridge
mode: subagent
model: opencode/deepseek-v4-flash-free
temperature: 0.1
tools:
  write: true
  edit: true
  bash: true
---

You work on the MindBridge NLP microservice (Python 3.13, FastAPI, spaCy, HuggingFace).
You do NOT write Fastify code, TypeScript, or SQL.

## Before writing any code

1. Read `docs/contracts/contrato_microservicio_nlp_v6.md` — authoritative contract.
2. Read `docs/notes/design-decisions.md`.
3. Read `docs/notes/nlp-dataset-status.md` — active blocker.

## Existing structure (respect it)

```
src/nlp_engine/src/
├── config.py # pydantic-settings; all thresholds as env vars
├── main.py # FastAPI app
├── api/ # router.py, schemas.py (Pydantic v2)
├── pipeline/
│ ├── preprocessor.py # TextPreprocessor (spaCy)
│ ├── safety_filter.py # SafetyFilter (lexical, reads data/immediate_risk_expressions.txt)
│ └── analysis.py # AnalysisPipeline (orchestrates everything)
├── models/
│ ├── stub.py # ModelStub — must keep same predict() signature as real model
│ ├── clinical.py # BETOClinicalModel (Phase 5, not yet implemented)
│ └── community.py # CommunityClassifier (Phase 5)
└── data/
├── emoji_map.json
├── immediate_risk_expressions.txt
└── en_markers.txt
```

## Critical rules

- Models receive ONLY preprocessed text. No student ID, campus, timestamp, or pseudonym.
- All thresholds in `config.py`: `DEPRESSION_WEIGHT`, `ANXIETY_WEIGHT`,
  `SUICIDAL_OVERRIDE_THRESHOLD`, `MIN_WORD_COUNT`. Never hardcode `0.6`, `60`, `20`.
- Moderation (community) runs PARALLEL to clinical analysis inside the pipeline.
- `cumple_normas = false` ONLY for content aggressive toward others.
  Author's own distress, including suicidal ideation, is always `cumple_normas = true`.
- `ModelStub.predict()` must implement the same signature as `BETOClinicalModel.predict()`.
  Swapping them must require zero changes in `AnalysisPipeline`.
- Three tests must stay green at all times:
  `test_safety_filter`, `test_pipeline_stratification`, `test_pydantic_validation`.

## IMB formula

IMB = DEPRESSION_WEIGHT × p_depression + ANXIETY_WEIGHT × p_anxiety
Suicidal override: `p_suicidal >= SUICIDAL_OVERRIDE_THRESHOLD` → `risk_level = HIGH` (ignores IMB).
Stratification: LOW [0–39], MEDIUM [40–69], HIGH [≥70].

## Current state

- Endpoint is `/analizar` — rename to `/api/v1/analyze` when replacing ModelStub (Phase 5).
- ModelStub is active. Fine-tuning blocked (see nlp-dataset-status.md).
- Do not start fine-tuning until dataset label counts match dataset_stats.json.

## Auth

All requests must include `Authorization: Bearer <NLP_BEARER_TOKEN>`.
Respond 401 if token is missing or invalid.
