from fastapi import APIRouter
from src.schemas.request import AnalysisRequest
from src.schemas.response import AnalysisResponse
from src.orchestration.pipeline import AnalysisPipeline

router = APIRouter()
_pipeline = AnalysisPipeline()


@router.post("/analizar", response_model=AnalysisResponse)
def analyze_text(request: AnalysisRequest) -> AnalysisResponse:
    return _pipeline.run(request)