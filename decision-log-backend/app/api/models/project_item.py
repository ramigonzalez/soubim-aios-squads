"""Pydantic models for Project Items API (V2 taxonomy)."""

from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class ItemType(str, Enum):
    IDEA = "idea"
    TOPIC = "topic"
    DECISION = "decision"
    ACTION_ITEM = "action_item"
    INFORMATION = "information"


class SourceType(str, Enum):
    MEETING = "meeting"
    EMAIL = "email"
    DOCUMENT = "document"
    MANUAL_INPUT = "manual_input"


class Discipline(str, Enum):
    ARCHITECTURE = "architecture"
    STRUCTURAL = "structural"
    MEP = "mep"
    ELECTRICAL = "electrical"
    PLUMBING = "plumbing"
    LANDSCAPE = "landscape"
    FIRE_PROTECTION = "fire_protection"
    ACOUSTICAL = "acoustical"
    SUSTAINABILITY = "sustainability"
    CIVIL = "civil"
    CLIENT = "client"
    CONTRACTOR = "contractor"
    TENANT = "tenant"
    ENGINEER = "engineer"
    GENERAL = "general"


class ConsensusEntry(BaseModel):
    status: str = Field(..., pattern=r"^(AGREE|DISAGREE|ABSTAIN)$")
    notes: Optional[str] = None


class ImpactsSchema(BaseModel):
    cost_impact: Optional[str] = None
    timeline_impact: Optional[str] = None
    scope_impact: Optional[str] = None
    risk_level: Optional[str] = Field(None, pattern=r"^(low|medium|high)$")
    affected_areas: Optional[List[str]] = None


class ProjectItemCreate(BaseModel):
    statement: str
    item_type: ItemType
    who: str
    affected_disciplines: List[Discipline]
    why: Optional[str] = None
    causation: Optional[str] = None
    owner: Optional[str] = None
    is_done: bool = False
    impacts: Optional[ImpactsSchema] = None
    consensus: Optional[Dict[str, ConsensusEntry]] = None


class ProjectItemUpdate(BaseModel):
    is_milestone: Optional[bool] = None
    is_done: Optional[bool] = None
    statement: Optional[str] = None


class SourceInfo(BaseModel):
    id: str
    title: Optional[str] = None
    type: str
    occurred_at: Optional[str] = None


class ProjectItemResponse(BaseModel):
    id: str
    project_id: str
    statement: str
    who: str
    timestamp: Optional[str] = None
    item_type: str
    source_type: str
    affected_disciplines: List[str]
    is_milestone: bool
    is_done: bool
    owner: Optional[str] = None
    why: Optional[str] = None
    causation: Optional[str] = None
    impacts: Optional[dict] = None
    consensus: Optional[dict] = None
    confidence: Optional[float] = None
    source_excerpt: Optional[str] = None
    source: Optional[SourceInfo] = None
    created_at: str
    updated_at: Optional[str] = None


class FacetsResponse(BaseModel):
    item_types: Dict[str, int] = {}
    source_types: Dict[str, int] = {}
    disciplines: Dict[str, int] = {}


class ProjectItemListResponse(BaseModel):
    items: List[ProjectItemResponse]
    total: int
    limit: int
    offset: int
    facets: Optional[FacetsResponse] = None


class DecisionResponse(BaseModel):
    """V1-compatible decision response for backward compatibility."""
    id: str
    project_id: str
    transcript_id: Optional[str] = None
    decision_statement: str
    who: str
    timestamp: Optional[str] = None
    discipline: str
    why: Optional[str] = None
    causation: Optional[str] = None
    impacts: Optional[dict] = None
    consensus: Optional[dict] = None
    confidence: Optional[float] = None
    meeting_title: Optional[str] = None
    meeting_type: Optional[str] = None
    meeting_date: Optional[str] = None
    meeting_participants: Optional[list] = None
    created_at: Optional[str] = None
