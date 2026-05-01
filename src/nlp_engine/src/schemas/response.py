from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ClinicalDimensions(BaseModel):
    p_depression: Optional[float] = Field(default=None, alias="p_depresion")
    p_anxiety: Optional[float] = Field(default=None, alias="p_ansiedad")
    p_suicidal: Optional[float] = Field(default=None, alias="p_suicida")

    model_config = {"populate_by_name": True}


class AnalysisMetadata(BaseModel):
    tokens_processed: int = Field(alias="tokens_procesados")
    context_entries_used: int = Field(alias="publicaciones_contexto_usadas")
    clinical_model_version: str = Field(alias="version_modelo_clinico")
    norms_model_version: str = Field(alias="version_modelo_normas")

    model_config = {"populate_by_name": True}


class AnalysisResponse(BaseModel):
    publication_id: str = Field(alias="id_publicacion")
    pseudonym_id: str = Field(alias="id_seudonimo")
    analysis_timestamp: datetime = Field(alias="timestamp_analisis")
    text_sufficient: bool = Field(alias="texto_suficiente")
    safety_filter_activated: bool = Field(alias="filtro_seguridad_activado")
    reduced_confidence: bool = Field(alias="confianza_reducida")
    warnings: list[str] = Field(default_factory=list, alias="advertencias")
    dimensions: ClinicalDimensions = Field(alias="dimensiones")
    imb: Optional[float] = Field(default=None)
    suicidal_override: Optional[bool] = Field(default=None, alias="override_suicida")
    risk_level: Optional[str] = Field(default=None, alias="nivel_riesgo")
    complies_with_norms: Optional[bool] = Field(default=None, alias="cumple_normas")
    norms_score: Optional[float] = Field(default=None, alias="score_normas")
    metadata: AnalysisMetadata = Field(alias="metadatos")
    explainability: Optional[dict] = Field(default=None, alias="explicabilidad")

    model_config = {"populate_by_name": True}