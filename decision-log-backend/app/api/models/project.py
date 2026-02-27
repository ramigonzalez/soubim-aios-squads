"""Pydantic models for Project Management API (Story 6.1)."""

from datetime import date
from typing import List, Optional

from pydantic import BaseModel, field_validator

from app.api.models.project_item import Discipline


class StageCreate(BaseModel):
    stage_name: str
    stage_from: date
    stage_to: date

    @field_validator("stage_to")
    @classmethod
    def end_after_start(cls, v, info):
        if "stage_from" in info.data and v <= info.data["stage_from"]:
            raise ValueError("stage_to must be after stage_from")
        return v


class StageUpdate(BaseModel):
    stage_name: Optional[str] = None
    stage_from: Optional[date] = None
    stage_to: Optional[date] = None


class StageResponse(BaseModel):
    id: str
    stage_name: str
    stage_from: str
    stage_to: str
    sort_order: int
    is_current: bool = False


class StageTemplateResponse(BaseModel):
    id: str
    project_type: str
    template_name: str
    stages: list


class ParticipantCreate(BaseModel):
    name: str
    email: Optional[str] = None
    discipline: Discipline
    role: Optional[str] = None


class ParticipantUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    discipline: Optional[Discipline] = None
    role: Optional[str] = None


class ParticipantResponse(BaseModel):
    id: str
    name: str
    email: Optional[str] = None
    discipline: Optional[str] = None
    role: Optional[str] = None


class ProjectCreate(BaseModel):
    title: str
    description: Optional[str] = None
    project_type: Optional[str] = None
    stages: Optional[List[StageCreate]] = None
    participants: Optional[List[ParticipantCreate]] = None


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    project_type: Optional[str] = None
    actual_stage_id: Optional[str] = None
