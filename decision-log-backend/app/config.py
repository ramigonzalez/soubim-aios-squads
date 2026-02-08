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
    demo_mode: bool = False  # SECURITY: Set to False in production!

    # CORS
    cors_origins: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
