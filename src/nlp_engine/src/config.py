from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Application
    app_version: str = "0.3.0"
    app_env: str = "development"
    
    #API_KEYS

    # IMB weights
    imb_weight_depression: float = 0.6
    imb_weight_anxiety: float = 0.4

    # Thresholds
    suicide_override_threshold: float = 60.0
    imb_medium_threshold: float = 40.0
    imb_high_threshold: float = 70.0
    
    # Preprocessor threshold
    mixed_language_threshold: float = 0.4

    # Text analysis
    min_words_for_analysis: int = 20
    max_context_entries: int = 5
    max_context_words_per_entry: int = 100

    # Stub values
    stub_p_depression: float = 40.0
    stub_p_anxiety: float = 30.0
    stub_p_suicidal: float = 20.0
    stub_score_norms: float = 0.1

    # Model versions
    clinical_model_version: str = "stub-v0.3"
    norms_model_version: str = "stub-v0.3"


settings = Settings()