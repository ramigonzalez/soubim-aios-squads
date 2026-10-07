"""Fathom routing rules of a project (Story 13.16).

- GET    /api/projects/{project_id}/fathom-rules            → the project's rules
- POST   /api/projects/{project_id}/fathom-rules            → add a rule {field, value}
- DELETE /api/projects/{project_id}/fathom-rules/{rule_id}  → remove a rule

Only users with ``review`` or ``admin`` on the project (Story 12.7: the owning organization's
owner/admin and its assigned reviewers — the people who work Ingestão) can call these; others get 403.
"""

import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.middleware.auth import get_current_user
from app.database.models import ProjectFathomRule
from app.database.session import get_db
from app.services import fathom_rules
from app.services.access import REVIEW, require_project_access

router = APIRouter()


class RuleCreate(BaseModel):
    field: Literal["title", "participant_email", "participant_domain"]
    value: str = Field(..., max_length=1000)  # trimmed, then checked against MAX_VALUE_LENGTH


def _format(rule: ProjectFathomRule) -> dict:
    return {
        "id": str(rule.id),
        "project_id": str(rule.project_id),
        "field": rule.field,
        "operator": rule.operator,
        "value": rule.value,
        "created_at": rule.created_at.isoformat() + "Z" if rule.created_at else None,
    }


@router.get("/projects/{project_id}/fathom-rules")
def list_rules(project_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    project = require_project_access(db, user, project_id, REVIEW)
    return [_format(r) for r in fathom_rules.rules_of(db, project.id)]


@router.post("/projects/{project_id}/fathom-rules", status_code=status.HTTP_201_CREATED)
def create_rule(project_id: str, body: RuleCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    project = require_project_access(db, user, project_id, REVIEW)
    try:
        value = fathom_rules.validate_value(body.field, body.value)
    except fathom_rules.InvalidRule as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    wanted = fathom_rules.normalize(value)
    for existing in fathom_rules.rules_of(db, project.id):
        if existing.field == body.field and fathom_rules.normalize(existing.value) == wanted:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This rule already exists")
    rule = ProjectFathomRule(
        project_id=project.id, field=body.field, operator=fathom_rules.OPERATORS[body.field], value=value,
        created_by=user.id,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return _format(rule)


@router.delete("/projects/{project_id}/fathom-rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rule(project_id: str, rule_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    project = require_project_access(db, user, project_id, REVIEW)
    try:
        rule = db.get(ProjectFathomRule, uuid.UUID(rule_id))
    except ValueError:
        rule = None
    if rule is None or str(rule.project_id) != str(project.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
    db.delete(rule)
    db.commit()
