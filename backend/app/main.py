import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.config import settings
from app.core.database import init_db
from app.api.v1 import detect, history, stats, agent, reports, knowledge, knowledge_graph_api
from app.models.knowledge_graph import GraphEntity, GraphRelation, KnowledgeDocument

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database...")
    await init_db()
    logger.info("Database initialized")

    logger.info("Creating static directories...")
    settings.ensure_dirs()
    logger.info("Static directories ready")

    logger.info(f"Model weights path: {settings.weights_path}")
    if settings.weights_path.exists():
        logger.info("Model weights file found (will be loaded on first detection request)")
    else:
        logger.warning("Model weights file NOT found - detection will fail until weights are configured")

    yield

    logger.info("Shutting down...")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Road Damage Detection System API",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
results_static = settings.results_dir
if not results_static.exists():
    results_static.mkdir(parents=True, exist_ok=True)
app.mount("/static/results", StaticFiles(directory=str(results_static)), name="results")

reports_static = settings.reports_dir
if not reports_static.exists():
    reports_static.mkdir(parents=True, exist_ok=True)
app.mount("/static/reports", StaticFiles(directory=str(reports_static)), name="reports")

uploads_static = settings.uploads_dir
if not uploads_static.exists():
    uploads_static.mkdir(parents=True, exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory=str(uploads_static)), name="uploads")

# Register routers
app.include_router(detect.router, prefix="/api/v1")
app.include_router(history.router, prefix="/api/v1")
app.include_router(stats.router, prefix="/api/v1")
app.include_router(agent.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")
app.include_router(knowledge.router, prefix="/api/v1")
app.include_router(knowledge_graph_api.router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "weights_found": settings.weights_path.exists(),
        "weights_path": str(settings.weights_path),
    }
