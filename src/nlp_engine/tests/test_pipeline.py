from src.orchestration.pipeline import AnalysisPipeline
from src.schemas.request import AnalysisRequest
from datetime import datetime, timezone


def _make_request(texto: str) -> AnalysisRequest:
    return AnalysisRequest(
        publication_id="f3a2b1c0-d4e5-4f67-89ab-cdef01234567",
        pseudonym_id="somb4a1d9e2",
        text=texto,
        timestamp=datetime.now(timezone.utc),
        previous_context=[],
        include_explainability=False,
    )


pipeline = AnalysisPipeline()


def test_full_analysis_returns_valid_response():
    texto = (
        "Esta semana no pude levantarme a clases, no tiene sentido seguir "
        "intentando nada. Siento que soy una carga para todos y que las cosas "
        "no van a mejorar nunca."
    )
    response = pipeline.run(_make_request(texto))

    assert response.texto_suficiente is True
    assert response.clinical is not None
    assert response.community is not None
    assert response.clinical.suicidal_override is True
    assert response.clinical.risk_level == "HIGH"
    assert response.clinical.top_clinical_label == "SUICIDAL"
    assert response.community.cumple_normas is True
    assert response.community.moderation_decision == "APPROVED"


def test_short_text_returns_insufficient_response():
    response = pipeline.run(_make_request("Hola mundo"))

    assert response.texto_suficiente is False
    assert response.clinical is None
    assert response.community is None


def test_short_text_with_risk_expression_activates_safety_filter():
    response = pipeline.run(_make_request("quiero morir ahora"))

    assert response.texto_suficiente is False
    assert response.safety_filter_triggered is True
    assert response.clinical is None
