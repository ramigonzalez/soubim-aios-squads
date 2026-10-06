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
    # Story 7.11: one model setting for every Claude call (extraction, summaries, email, documents)
    llm_model: str = "claude-opus-5-5"
    extraction_max_tokens: int = 64000  # streamed; a 98-min meeting needed ~11k output tokens
    extraction_effort: str = "high"

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

    # --- Gmail API (Story 7.4) ---
    gmail_credentials_json: Optional[str] = None
    gmail_poll_interval_minutes: int = 15
    gmail_label_filter: str = "INBOX"
    gmail_max_results_per_poll: int = 20

    def is_gmail_configured(self) -> bool:
        """Return True if Gmail API credentials are provided."""
        return self.gmail_credentials_json is not None

    # --- Google Drive API (Story 10.3) ---
    google_drive_enabled: bool = False
    google_drive_service_account_key: Optional[str] = None
    drive_poll_interval_minutes: int = 60

    def is_drive_configured(self) -> bool:
        """Return True if Google Drive monitoring is enabled and configured."""
        return self.google_drive_enabled and self.google_drive_service_account_key is not None

    # --- Source Curation (Story 7.7) ---
    curation_sync_enabled: bool = False
    curation_sync_interval_hours: int = 24

    # --- Recording storage, S3-compatible (Story 13.1) ---
    # Storage is "enabled" only when endpoint, credentials and bucket are all set.
    # SeaweedFS in dev, Cloudflare R2 / Backblaze B2 in production (same code).
    s3_endpoint: Optional[str] = None
    s3_region: str = "us-east-1"
    s3_access_key_id: Optional[str] = None
    s3_secret_access_key: Optional[str] = None
    s3_bucket: Optional[str] = None
    recording_max_bytes: int = 2 * 1024**3  # 2 GB per recording

    def is_storage_configured(self) -> bool:
        """Return True if S3-compatible storage is fully configured."""
        return all([self.s3_endpoint, self.s3_access_key_id, self.s3_secret_access_key, self.s3_bucket])

    class Config:
        # Load from .env.development first (for development), then fall back to .env
        env_file = ".env.development"
        case_sensitive = False


# Try to load settings, falling back to .env if .env.development doesn't exist
import os
if not os.path.exists(".env.development"):
    Settings.model_config = {"env_file": ".env"}

settings = Settings()
