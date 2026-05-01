from fastapi import FastAPI
from src.routers import health, analysis
from src.config import settings

app = FastAPI(
    title="MindBridge NLP Engine",
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.include_router(health.router, tags=["Sistema"])
app.include_router(analysis.router, tags=["Análisis"])