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

    assert response.text_sufficient is True
    assert response.risk_level == "bajo"
    assert response.suicidal_override is False
    assert response.complies_with_norms is True
    assert response.imb == 36.0
    assert response.dimensions.p_depression == 40.0
    assert response.dimensions.p_anxiety == 30.0
    assert response.dimensions.p_suicidal == 20.0


def test_short_text_returns_insufficient_response():
    response = pipeline.run(_make_request("Hola mundo"))

    assert response.text_sufficient is False
    assert response.risk_level is None
    assert response.imb is None
    assert response.dimensions.p_depression is None


def test_short_text_with_risk_expression_activates_safety_filter():
    response = pipeline.run(_make_request("quiero morir ahora"))

    assert response.text_sufficient is False
    assert response.safety_filter_activated is True
    assert response.risk_level == "alto_por_filtro_seguridad"