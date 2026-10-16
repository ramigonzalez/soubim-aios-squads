"""Promem revamp Phase 5: POST /api/leads — the landing page's contact form (public, rate limited).

The destination (e-mail / CRM / WhatsApp) is still to be defined; requests are stored and listed to
the platform operator (``GET /api/platform/leads``). A filled honeypot (``website``) is accepted
with 201 and dropped, so bots learn nothing.
"""

import re
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy.orm import Session

from app.database.models import Lead
from app.database.session import get_db

router = APIRouter()


class LeadCreate(BaseModel):
    mode: Literal["demo", "pilot"]
    name: str = Field(min_length=2, max_length=120)
    company: str = Field(min_length=1, max_length=160)
    whatsapp: str = Field(max_length=30)
    email: EmailStr
    role: Literal["partner", "coordinator", "architect", "other"] | None = None
    team_size: Literal["1-9", "10-24", "25-50", "50+"] | None = None
    website: str = ""  # honeypot: people never see it

    @field_validator("name", "company")
    @classmethod
    def _strip(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("required")
        return value

    @field_validator("whatsapp")
    @classmethod
    def _phone(cls, value: str) -> str:
        digits = re.sub(r"\D", "", value)
        if digits.startswith("55") and len(digits) in (12, 13):
            digits = digits[2:]
        if len(digits) not in (10, 11):
            raise ValueError("invalid_phone")
        return digits


@router.post("/leads", status_code=201)
def create_lead(body: LeadCreate, db: Session = Depends(get_db)):
    if body.website.strip():
        return {"ok": True}
    db.add(Lead(**body.model_dump(exclude={"website"})))
    db.commit()
    return {"ok": True}
