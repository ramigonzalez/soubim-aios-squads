"""Pydantic models for ingestion API endpoints."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class IngestionUpdate(BaseModel):
    """Request model for updating source ingestion status."""

    ingestion_status: str = Field(
        ...,
        description="New ingestion status (approved or rejected)",
    )

    @field_validator("ingestion_status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        allowed = {"approved", "rejected"}
        if v not in allowed:
            raise ValueError(f"ingestion_status must be one of {allowed}")
        return v


class IngestionBatchAction(BaseModel):
    """Request model for batch approve/reject of sources."""

    source_ids: List[str] = Field(
        ...,
        min_length=1,
        description="List of source IDs to update",
    )
    action: str = Field(
        ...,
        description="Action to perform (approve or reject)",
    )

    @field_validator("action")
    @classmethod
    def validate_action(cls, v: str) -> str:
        allowed = {"approve", "reject"}
        if v not in allowed:
            raise ValueError(f"action must be one of {allowed}")
        return v


class SourceResponse(BaseModel):
    """Response model for a single source."""

    id: str
    project_id: str
    project_name: Optional[str] = None
    source_type: str
    title: Optional[str] = None
    occurred_at: Optional[str] = None
    ingestion_status: str
    ai_summary: Optional[str] = None
    # Meeting-specific
    meeting_type: Optional[str] = None
    # Email-specific
    email_from: Optional[str] = None
    # Document-specific
    file_name: Optional[str] = None
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    # Timestamps
    created_at: Optional[str] = None


class SourceListResponse(BaseModel):
    """Response model for paginated source list."""

    sources: List[SourceResponse]
    total: int
    limit: int
    offset: int
