from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator
import uuid


class PreviousContext(BaseModel):
    summarized_text: str = Field(
        alias="texto_resumido",
        max_length=600,  # ~100 words in Spanish
    )
    timestamp: datetime = Field(alias="timestamp")
    previous_risk_level: Optional[str] = Field(
        default=None,
        alias="nivel_riesgo_previo",
    )

    model_config = {"populate_by_name": True}


class AnalysisRequest(BaseModel):
    publication_id: str = Field(alias="id_publicacion")
    pseudonym_id: str = Field(alias="id_seudonimo")
    text: str = Field(alias="texto", min_length=1)
    timestamp: datetime
    previous_context: list[PreviousContext] = Field(
        default_factory=list,
        alias="contexto_previo",
    )
    include_explainability: bool = Field(
        default=False,
        alias="incluir_explicabilidad",
    )

    model_config = {"populate_by_name": True}

    @field_validator("publication_id")
    @classmethod
    def validate_uuid(cls, value: str) -> str:
        uuid.UUID(value)  # raises ValueError if invalid
        return value

    @field_validator("previous_context")
    @classmethod
    def validate_context_limit(cls, value: list) -> list:
        if len(value) > 5:
            raise ValueError("previous_context cannot have more than 5 entries")
        return value