"""Promem revamp Phase 5: the landing page's contact form (POST /api/leads) and the operator's list."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.database.models import Lead, User
from app.utils.security import create_access_token, hash_password

FORM = {
    "mode": "pilot",
    "name": " Gabriela Souza ",
    "company": "souBIM",
    "whatsapp": "(11) 9 8765-4321",
    "email": "gabriela@soubim.com.br",
    "role": "partner",
    "team_size": "10-24",
    "website": "",
}


@pytest.fixture
def client(pg_session):
    from app.main import app

    return TestClient(app)


def _headers(db: Session, operator: bool):
    user = User(email="op@platform.com" if operator else "gabi@soubim.com", password_hash=hash_password("password"), name="Operadora",
                role="director", is_platform_operator=operator)
    db.add(user)
    db.commit()
    return user, {"Authorization": "Bearer " + create_access_token(str(user.id), user.email, user.role)}


def test_public_form_stores_the_request(client, pg_session: Session):
    response = client.post("/api/leads", json=FORM)
    assert response.status_code == 201 and response.json() == {"ok": True}
    lead = pg_session.query(Lead).one()
    assert (lead.mode, lead.name, lead.whatsapp, lead.role, lead.team_size) == ("pilot", "Gabriela Souza", "11987654321", "partner", "10-24")


def test_country_code_and_landlines_are_accepted(client, pg_session: Session):
    assert client.post("/api/leads", json={**FORM, "whatsapp": "+55 11 98765-4321"}).status_code == 201
    assert client.post("/api/leads", json={**FORM, "whatsapp": "(11) 3456-7890", "role": None, "team_size": None}).status_code == 201
    assert {lead.whatsapp for lead in pg_session.query(Lead)} == {"11987654321", "1134567890"}


@pytest.mark.parametrize(
    "field,value",
    [("email", "not-an-email"), ("whatsapp", "123"), ("name", " "), ("mode", "sales"), ("team_size", "100+"), ("company", "")],
)
def test_invalid_fields_are_reported_per_field(client, pg_session: Session, field, value):
    response = client.post("/api/leads", json={**FORM, field: value})
    assert response.status_code == 422
    assert any(err["loc"][-1] == field for err in response.json()["detail"])
    assert pg_session.query(Lead).count() == 0


def test_honeypot_is_dropped_silently(client, pg_session: Session):
    assert client.post("/api/leads", json={**FORM, "website": "http://spam"}).status_code == 201
    assert pg_session.query(Lead).count() == 0


def test_operator_lists_and_marks_requests(client, pg_session: Session):
    client.post("/api/leads", json=FORM)
    client.post("/api/leads", json={**FORM, "mode": "demo", "name": "Carlos"})
    _, headers = _headers(pg_session, operator=True)
    leads = client.get("/api/platform/leads", headers=headers).json()["leads"]
    assert [lead["name"] for lead in leads] == ["Carlos", "Gabriela Souza"]
    updated = client.patch(f"/api/platform/leads/{leads[0]['id']}", headers=headers, json={"handled": True}).json()
    assert updated["handled_by"] == "Operadora" and updated["handled_at"]
    reopened = client.patch(f"/api/platform/leads/{leads[0]['id']}", headers=headers, json={"handled": False}).json()
    assert reopened["handled_at"] is None


def test_only_the_operator_sees_requests(client, pg_session: Session):
    _, headers = _headers(pg_session, operator=False)
    assert client.get("/api/platform/leads", headers=headers).status_code == 403
    assert client.get("/api/platform/leads").status_code == 401
