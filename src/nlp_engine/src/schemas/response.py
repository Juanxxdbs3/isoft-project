from __future__ import annotations

from typing import Optional
from pydantic import BaseModel


class ClinicalSection(BaseModel):
    p_depresion: Optional[float] = None
    p_ansiedad: Optional[float] = None
    p_suicida: Optional[float] = None
    imb: Optional[float] = None
    suicidal_override: Optional[bool] = None
    risk_level: Optional[str] = None
    top_clinical_label: Optional[str] = None
    rationale: Optional[str] = None


class CommunitySection(BaseModel):
    cumple_normas: Optional[bool] = None
    score_normas: Optional[float] = None
    moderation_decision: Optional[str] = None


class AnalysisResponse(BaseModel):
    id_publicacion: str
    status: str
    timestamp_analisis: str
    execution_time_ms: float
    texto_suficiente: bool
    safety_filter_triggered: bool
    confianza_reducida: bool
    advertencias: list[str]
    clinical: Optional[ClinicalSection] = None
    community: Optional[CommunitySection] = None
    metadatos: dict
    explicabilidad: Optional[dict] = None
