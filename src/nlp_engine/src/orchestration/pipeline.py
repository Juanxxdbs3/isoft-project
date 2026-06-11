import time
from datetime import datetime, timezone
from src.config import settings
from src.orchestration.preprocessor import TextPreprocessor
from src.orchestration.safety_filter import SafetyFilter
from src.models.clinical import BETOClinicalModel
from src.models.community import CommunityClassifier
from src.schemas.request import AnalysisRequest
from src.schemas.response import (
    AnalysisResponse,
    ClinicalSection,
    CommunitySection,
)


class AnalysisPipeline:
    def __init__(self) -> None:
        self._preprocessor = TextPreprocessor(
            mixed_language_threshold=settings.mixed_language_threshold,
        )
        self._safety_filter = SafetyFilter()
        self._clinical_model = BETOClinicalModel(settings.clinical_model_path)

        self._community_model = CommunityClassifier(
            shared_encoder=self._clinical_model.backbone,
            head_path=f"{settings.community_model_path}/community_classifier_head.pt",
            device=str(self._clinical_model.device),
        )

    def run(self, request: AnalysisRequest) -> AnalysisResponse:
        preprocessing = self._preprocessor.process(request.text)
        warnings = self._build_warnings(preprocessing.mixed_language_detected)

        if preprocessing.word_count < settings.min_words_for_analysis:
            return self._handle_short_text(request, warnings)

        return self._handle_full_analysis(request, preprocessing, warnings)

    def _handle_short_text(
        self,
        request: AnalysisRequest,
        warnings: list[str],
    ) -> AnalysisResponse:
        safety_result = self._safety_filter.evaluate(request.text)

        return AnalysisResponse(
            id_publicacion=request.publication_id,
            status="success",
            timestamp_analisis=datetime.now(timezone.utc).isoformat(),
            execution_time_ms=0.0,
            texto_suficiente=False,
            safety_filter_triggered=safety_result.activated,
            confianza_reducida=False,
            advertencias=warnings,
            clinical=None,
            community=None,
            metadatos={
                "tokens_procesados": 0,
                "publicaciones_contexto_usadas": len(request.previous_context),
                "version_modelo_clinico": settings.clinical_model_version,
                "version_modelo_normas": settings.community_model_version,
            },
            explicabilidad=None,
        )

    def _handle_full_analysis(
        self,
        request: AnalysisRequest,
        preprocessing,
        warnings: list[str],
    ) -> AnalysisResponse:
        start = time.monotonic()

        encoding = self._clinical_model.tokenizer(
            preprocessing.normalized_text,
            max_length=256,
            padding="max_length",
            truncation=True,
            return_tensors="pt",
        )

        clinical_scores = self._clinical_model.predict_tokens(
            encoding["input_ids"], encoding["attention_mask"]
        )

        score_normas = self._community_model.predict(
            encoding["input_ids"], encoding["attention_mask"]
        )

        imb = (
            settings.imb_weight_depression * clinical_scores["p_depresion"]
            + settings.imb_weight_anxiety * clinical_scores["p_ansiedad"]
        )
        suicidal_override = (
            clinical_scores["p_suicida"] >= settings.suicide_override_threshold
        )
        risk_level = self._stratify(imb, suicidal_override)

        score_normas = 1.0

        elapsed_ms = (time.monotonic() - start) * 1000

        return AnalysisResponse(
            id_publicacion=request.publication_id,
            status="success",
            timestamp_analisis=datetime.now(timezone.utc).isoformat(),
            execution_time_ms=round(elapsed_ms, 2),
            texto_suficiente=True,
            safety_filter_triggered=False,
            confianza_reducida=preprocessing.mixed_language_detected,
            advertencias=warnings,
            clinical=ClinicalSection(
                p_depresion=round(clinical_scores["p_depresion"], 2),
                p_ansiedad=round(clinical_scores["p_ansiedad"], 2),
                p_suicida=round(clinical_scores["p_suicida"], 2),
                imb=round(imb, 2),
                suicidal_override=suicidal_override,
                risk_level=risk_level,
                top_clinical_label=self._top_label(clinical_scores),
                rationale=None,
            ),
            community=CommunitySection(
                cumple_normas=score_normas >= 0.5,
                score_normas=round(score_normas, 4),
                moderation_decision="APPROVED",
            ),
            metadatos={
                "tokens_procesados": encoding["input_ids"].shape[1],
                "publicaciones_contexto_usadas": len(request.previous_context),
                "version_modelo_clinico": settings.clinical_model_version,
                "version_modelo_normas": settings.community_model_version,
            },
            explicabilidad=None,
        )

    def _stratify(self, imb: float, suicidal_override: bool) -> str:
        if suicidal_override:
            return "HIGH"
        if imb >= settings.imb_high_threshold:
            return "HIGH"
        if imb >= settings.imb_medium_threshold:
            return "MEDIUM"
        return "LOW"

    def _top_label(self, scores: dict) -> str:
        max_dim = max(scores, key=scores.get)
        label_map = {
            "p_depresion": "DEPRESSION",
            "p_ansiedad": "ANXIETY",
            "p_suicida": "SUICIDAL",
        }
        return label_map[max_dim]

    def _build_warnings(self, mixed_language_detected: bool) -> list[str]:
        warnings = []
        if mixed_language_detected:
            warnings.append("texto_mixto_detectado")
        return warnings
