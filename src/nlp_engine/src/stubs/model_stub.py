from dataclasses import dataclass
from src.config import settings


@dataclass
class ModelScores:
    p_depression: float
    p_anxiety: float
    p_suicidal: float
    score_norms: float


class ModelStub:
    """
    Simulates the clinical classifier and norms classifier.
    Returns fixed values from settings to allow backend integration
    before the real BETO model is available.
    Scores are configurable per environment via .env (STUB_* variables).
    """

    def predict(self, text: str) -> ModelScores:
        return ModelScores(
            p_depression=settings.stub_p_depression,
            p_anxiety=settings.stub_p_anxiety,
            p_suicidal=settings.stub_p_suicidal,
            score_norms=settings.stub_score_norms,
        )