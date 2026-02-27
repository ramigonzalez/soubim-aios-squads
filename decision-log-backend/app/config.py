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

    # --- Gmail API Poller (Story 7.4) ---
    # OAuth2 credentials -- use service account for server-to-server auth
    gmail_client_id: Optional[str] = None
    gmail_client_secret: Optional[str] = None
    gmail_refresh_token: Optional[str] = None
    # Alternative: service account JSON (base64-encoded)
    gmail_service_account_json: Optional[str] = None

    # Polling configuration
    gmail_poll_interval_minutes: int = 30  # How often to poll Gmail
    gmail_label_filter: str = ""  # Gmail label to filter (empty = all unread)
    gmail_max_results_per_poll: int = 50  # Max emails fetched per cycle

    class Config:
        # Load from .env.development first (for development), then fall back to .env
        env_file = ".env.development"
        case_sensitive = False

    def is_gmail_configured(self) -> bool:
        """Return True if Gmail API credentials are present."""
        has_oauth2 = all(
            [
                self.gmail_client_id,
                self.gmail_client_secret,
                self.gmail_refresh_token,
            ]
        )
        has_service_account = self.gmail_service_account_json is not None
        return has_oauth2 or has_service_account


# Try to load settings, falling back to .env if .env.development doesn't exist
import os
if not os.path.exists(".env.development"):
    Settings.model_config = {"env_file": ".env"}

settings = Settings()
