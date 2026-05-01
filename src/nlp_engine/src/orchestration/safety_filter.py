"""
    This file is intended to implement a safety filter that evaluates preprocessed text for immediate risk 
    indicators. It loads a predefined set of expressions associated with high-risk situations 
    (e.g., suicidal ideation, self-harm) and checks if any of these expressions are present in the normalized text. 
    The result of this evaluation is used in the main analysis pipeline to determine if the text should be flagged 
    for safety concerns, especially in cases where the word count is below the threshold for full analysis.
"""
from dataclasses import dataclass
from pathlib import Path


_EXPRESSIONS_PATH = Path(__file__).parent.parent.parent / "data" / "immediate_risk_expressions.txt"


def _load_expressions(path: Path) -> frozenset[str]:
    if not path.exists():
        return frozenset()
    lines = path.read_text(encoding="utf-8").splitlines()
    return frozenset(line.strip().lower() for line in lines if line.strip())


@dataclass
class SafetyFilterResult:
    activated: bool
    matched_expression: str | None = None


class SafetyFilter:
    def __init__(
        self,
        expressions: frozenset[str] | None = None,
    ) -> None:
        self._expressions = expressions if expressions is not None else _load_expressions(_EXPRESSIONS_PATH)

    def evaluate(self, normalized_text: str) -> SafetyFilterResult:
        text_lower = normalized_text.lower()
        for expression in self._expressions:
            if expression in text_lower:
                return SafetyFilterResult(activated=True, matched_expression=expression)
        return SafetyFilterResult(activated=False)