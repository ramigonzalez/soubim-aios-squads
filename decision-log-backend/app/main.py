"""FastAPI application initialization and main entry point."""

import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.api.routes import auth, health, projects, decisions, digest, webhooks, project_items, stages, participants
from app.api.middleware.auth import auth_middleware
from app.database.init_db import init_db

logger = logging.getLogger(__name__)


# Initialize Sentry if configured
if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.environment,
        traces_sample_rate=1.0 if settings.debug else 0.1,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager."""
    # Startup
    try:
        init_db()
        logger.info("✅ Database initialization completed")
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        if settings.debug:
            # In development, continue even if DB init fails
            logger.warning("Continuing in debug mode despite DB init failure")
        else:
            raise
    yield
    # Shutdown


# Create FastAPI application
app = FastAPI(
    title="DecisionLog API",
    description="AI-Powered Architectural Decision System",
    version="1.0.0",
    lifespan=lifespan,
)

# Add authentication middleware (must be before CORS)
app.middleware("http")(auth_middleware)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(health.router, tags=["health"])
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(project_items.router, prefix="/api", tags=["project-items"])
app.include_router(stages.router, prefix="/api", tags=["stages"])
app.include_router(participants.router, prefix="/api", tags=["participants"])
app.include_router(decisions.router, prefix="/api", tags=["decisions"])
app.include_router(digest.router, prefix="/api", tags=["digest"])
app.include_router(webhooks.router, prefix="/api/webhooks", tags=["webhooks"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "DecisionLog API",
        "version": "1.0.0",
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
    )
