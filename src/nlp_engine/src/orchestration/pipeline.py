""""
    This file contains the main orchestration pipeline for processing analysis requests. 
    It integrates text preprocessing, safety filtering, and model inference to produce a comprehensive 
    analysis response. The pipeline handles both short texts that do not meet the minimum word count for 
    analysis and longer texts that undergo full processing. It also calculates risk levels based on model 
    scores and applies safety filters when necessary.
"""

from datetime import datetime, timezone
from src.config import settings
from src.orchestration.preprocessor import TextPreprocessor
from src.orchestration.safety_filter import SafetyFilter
from src.stubs.model_stub import ModelStub
from src.schemas.request import AnalysisRequest
from src.schemas.response import (
    AnalysisResponse,
    ClinicalDimensions,
    AnalysisMetadata,
)


class RiskLevel:
    LOW = "bajo"
    MEDIUM = "medio"
    HIGH = "alto"
    HIGH_SAFETY_FILTER = "alto_por_filtro_seguridad"


class AnalysisPipeline:
    def __init__(self) -> None:
        self._preprocessor = TextPreprocessor(
            mixed_language_threshold=settings.mixed_language_threshold
        )
        self._safety_filter = SafetyFilter()
        self._model = ModelStub()

    def run(self, request: AnalysisRequest) -> AnalysisResponse:
        preprocessing = self._preprocessor.process(request.text)
        warnings = self._build_warnings(preprocessing.mixed_language_detected)

        if preprocessing.word_count < settings.min_words_for_analysis:
            return self._handle_short_text(request, preprocessing, warnings)

        return self._handle_full_analysis(request, preprocessing, warnings)

    def _handle_short_text(
        self,
        request: AnalysisRequest,
        preprocessing,
        warnings: list[str],
    ) -> AnalysisResponse:
        safety_result = self._safety_filter.evaluate(preprocessing.normalized_text)

        if safety_result.activated:
            return self._build_response(
                request=request,
                text_sufficient=False,
                safety_filter_activated=True,
                reduced_confidence=preprocessing.mixed_language_detected,
                warnings=warnings,
                dimensions=ClinicalDimensions(),
                imb=None,
                suicidal_override=None,
                risk_level=RiskLevel.HIGH_SAFETY_FILTER,
                complies_with_norms=None,
                norms_score=None,
                tokens_processed=0,
                context_entries_used=0,
            )

        return self._build_response(
            request=request,
            text_sufficient=False,
            safety_filter_activated=False,
            reduced_confidence=preprocessing.mixed_language_detected,
            warnings=warnings,
            dimensions=ClinicalDimensions(),
            imb=None,
            suicidal_override=None,
            risk_level=None,
            complies_with_norms=None,
            norms_score=None,
            tokens_processed=0,
            context_entries_used=0,
        )

    def _handle_full_analysis(
        self,
        request: AnalysisRequest,
        preprocessing,
        warnings: list[str],
    ) -> AnalysisResponse:
        model_input = self._build_model_input(request, preprocessing.normalized_text)
        scores = self._model.predict(model_input)

        imb = self._calculate_imb(scores.p_depression, scores.p_anxiety)
        suicidal_override = scores.p_suicidal >= settings.suicide_override_threshold
        risk_level = self._classify_risk(imb, suicidal_override)
        complies_with_norms = scores.score_norms < 0.5

        context_entries_used = min(
            len(request.previous_context), settings.max_context_entries
        )

        return self._build_response(
            request=request,
            text_sufficient=True,
            safety_filter_activated=False,
            reduced_confidence=preprocessing.mixed_language_detected,
            warnings=warnings,
            dimensions=ClinicalDimensions(
                p_depression=round(scores.p_depression, 2),
                p_anxiety=round(scores.p_anxiety, 2),
                p_suicidal=round(scores.p_suicidal, 2),
            ),
            imb=round(imb, 2),
            suicidal_override=suicidal_override,
            risk_level=risk_level,
            complies_with_norms=complies_with_norms,
            norms_score=round(scores.score_norms, 4),
            tokens_processed=len(model_input.split()),
            context_entries_used=context_entries_used,
        )

    def _build_model_input(self, request: AnalysisRequest, normalized_text: str) -> str:
        context_entries = request.previous_context[: settings.max_context_entries]
        parts = [entry.summarized_text for entry in context_entries]
        parts.append(normalized_text)
        return " [SEP] ".join(parts) #[SEP] es el token separador nativo de BERT/BETO

    def _calculate_imb(self, p_depression: float, p_anxiety: float) -> float:
        return (
            settings.imb_weight_depression * p_depression
            + settings.imb_weight_anxiety * p_anxiety
        )

    def _classify_risk(self, imb: float, suicidal_override: bool) -> str:
        if suicidal_override:
            return RiskLevel.HIGH
        if imb >= settings.imb_high_threshold:
            return RiskLevel.HIGH
        if imb >= settings.imb_medium_threshold:
            return RiskLevel.MEDIUM
        return RiskLevel.LOW

    def _build_warnings(self, mixed_language_detected: bool) -> list[str]:
        warnings = []
        if mixed_language_detected:
            warnings.append("texto_mixto_detectado")
        return warnings

    def _build_response(self, request: AnalysisRequest, **kwargs) -> AnalysisResponse:
        return AnalysisResponse(
            publication_id=request.publication_id,
            pseudonym_id=request.pseudonym_id,
            analysis_timestamp=datetime.now(timezone.utc),
            metadata=AnalysisMetadata(
                tokens_processed=kwargs["tokens_processed"],
                context_entries_used=kwargs["context_entries_used"],
                clinical_model_version=settings.clinical_model_version,
                norms_model_version=settings.norms_model_version,
            ),
            **{k: v for k, v in kwargs.items() if k not in ("tokens_processed", "context_entries_used")},
        )