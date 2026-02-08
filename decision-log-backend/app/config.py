"""Application configuration using Pydantic Settings."""

from pydantic_settings import BaseSettings
from typing import Optional, List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str

    # JWT Configuration
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 10080  # 7 days

    # Anthropic API
    anthropic_api_key: str

    # Tactiq Webhook
    tactiq_webhook_secret: str

    # Sentry
    sentry_dsn: Optional[str] = None

    # Environment
    environment: str = "development"
    debug: bool = True
    demo_mode: bool = False  # SECURITY: Set to False in production! (enables test data seeding)

    # CORS
    cors_origins: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    class Config:
        # Load from .env.development first (for development), then fall back to .env
        env_file = ".env.development"
        case_sensitive = False


# Try to load settings, falling back to .env if .env.development doesn't exist
import os
if not os.path.exists(".env.development"):
    Settings.model_config = {"env_file": ".env"}

settings = Settings()
