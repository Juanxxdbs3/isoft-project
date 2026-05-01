"""
    This file contains the text preprocessing logic for preparing input text for analysis. It performs normalization, URL and mention removal, 
    emoji replacement, and detects mixed (currently only spanglish) language usage. The preprocessed text 
    is then used in the main analysis pipeline to determine if it meets the criteria for full analysis or 
    if it should be flagged for safety concerns due to insufficient content or mixed language indicators.
"""
import re
import spacy
from dataclasses import dataclass
from pathlib import Path
import json


@dataclass
class PreprocessingResult:
    normalized_text: str
    word_count: int
    mixed_language_detected: bool


class TextPreprocessor:
    _EN_MARKERS_PATH = Path(__file__).parent.parent.parent / "data" / "en_markers.txt"
    _EMOJI_MAP_PATH = Path(__file__).parent.parent.parent / "data" / "emoji_map.json"

    def __init__(
        self,
        spacy_model: str = "es_core_news_sm",
        mixed_language_threshold: float = 0.4,
    ) -> None:
        self._nlp = spacy.load(spacy_model)
        self._mixed_language_threshold = mixed_language_threshold
        self._en_markers = self._load_en_markers()
        self._emoji_map = self._load_emoji_map()
        
    def _load_en_markers(self) -> frozenset[str]:
        if not self._EN_MARKERS_PATH.exists():
            return frozenset()
        lines = self._EN_MARKERS_PATH.read_text(encoding="utf-8").splitlines()
        return frozenset(word.strip().lower() for word in lines if word.strip())

    def _load_emoji_map(self) -> dict[str, str]:
        if not self._EMOJI_MAP_PATH.exists():
            return {}
        return json.loads(self._EMOJI_MAP_PATH.read_text(encoding="utf-8"))

    def process(self, raw_text: str) -> PreprocessingResult:
        text = self._replace_emojis(raw_text)
        text = self._normalize_unicode(text)
        text = self._remove_urls_and_mentions(text)
        text = self._normalize_whitespace(text)

        word_count = self._count_words(text)
        mixed_language = self._detect_mixed_language(text)

        return PreprocessingResult(
            normalized_text=text,
            word_count=word_count,
            mixed_language_detected=mixed_language,
        )

    def _replace_emojis(self, text: str) -> str:
        for emoji, replacement in self._emoji_map.items():
            text = text.replace(emoji, f" {replacement} ")
        # Remove unmapped emojis
        text = re.sub(r"[^\x00-\x7F\u00C0-\u024F\u0400-\u04FF\s]", " ", text)
        return text

    def _normalize_unicode(self, text: str) -> str:
        import unicodedata
        return unicodedata.normalize("NFC", text)

    def _remove_urls_and_mentions(self, text: str) -> str:
        # http(s) and ftp URLs
        text = re.sub(r"[a-z]+://\S+", " ", text, flags=re.IGNORECASE)
        # www. domains
        text = re.sub(r"www\.\S+", " ", text, flags=re.IGNORECASE)
        # IP addresses with optional port and path
        text = re.sub(r"\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?(?:/\S*)?", " ", text)
        # localhost with port
        text = re.sub(r"localhost(?::\d+)?(?:/\S*)?", " ", text, flags=re.IGNORECASE)
        # @mentions and #hashtags
        text = re.sub(r"[@#]\w+", " ", text)
        return text

    def _normalize_whitespace(self, text: str) -> str:
        return re.sub(r"\s+", " ", text).strip()

    def _count_words(self, text: str) -> int:
        doc = self._nlp(text)
        return sum(1 for token in doc if not token.is_space)

    def _detect_mixed_language(self, text: str) -> bool:
        if not self._en_markers:
            return False
        words = [w.lower() for w in text.split() if w.strip()]
        if not words:
            return False
        hits = sum(1 for w in words if w in self._en_markers)
        return (hits / len(words)) >= self._mixed_language_threshold