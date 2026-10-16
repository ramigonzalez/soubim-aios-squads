"""Promem revamp Phase 3d: ingestion insights (G2), candidate preview (G2), project on approve (G2c), undo (G5)."""

import json
from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.database.models import Job, Project, ProjectFathomRule, ProjectParticipant, Source, User
from app.services import candidate_preview
from app.services.ingestion_insights import flags, insights, preview, routing
from app.utils.security import create_access_token, hash_password
from tests.org_helpers import default_org_id, make_org_member

NOW = datetime(2026, 3, 2, 14, 0)


def _user(db: Session, email="gabriela@soubim.com", role="admin") -> User:
    user = User(email=email, password_hash=hash_password("password"), name=email.split("@")[0].title(), role="director")
    db.add(user)
    make_org_member(db, user, role)
    db.commit()
    return user


def _project(db: Session, name="Residential Tower Alpha", **fields) -> Project:
    project = Project(owner_organization_id=default_org_id(db), name=name, **fields)
    db.add(project)
    db.commit()
    return project


def _source(db: Session, project: Project, **fields) -> Source:
    data = dict(project_id=project.id, owner_organization_id=project.owner_organization_id, source_type="meeting", title="Reunião semanal", occurred_at=NOW, ingestion_status="pending")
    data.update(fields)
    source = Source(**data)
    db.add(source)
    db.commit()
    return source


class TestRouting:
    def test_drive_folder_is_high_confidence(self, db_session: Session):
        project = _project(db_session, drive_folder_id="folder-1")
        source = _source(db_session, project, source_type="document", title="Laudo.pdf", drive_file_id="f1")
        assert routing(db_session, source) == {"confidence": "high", "reasons": [{"code": "drive_folder"}]}

    def test_fathom_rule_and_participant_overlap(self, db_session: Session):
        project = _project(db_session)
        db_session.add(ProjectFathomRule(project_id=project.id, field="title", operator="contains", value="pódio"))
        db_session.add(ProjectParticipant(project_id=project.id, name="Carlos", email="carlos@estrutura.com", discipline="structural"))
        db_session.commit()
        source = _source(db_session, project, title="Revisão do pódio", participants=[{"name": "Carlos", "email": "carlos@estrutura.com"}, {"name": "Ana", "email": "ana@cliente.com"}])
        result = routing(db_session, source)
        assert result["confidence"] == "high"
        assert {"code": "fathom_rule", "field": "title", "operator": "contains", "value": "pódio"} in result["reasons"]
        assert {"code": "participants_overlap", "count": 1, "total": 2} in result["reasons"]

    def test_email_sender_and_thread(self, db_session: Session):
        project = _project(db_session)
        db_session.add(ProjectParticipant(project_id=project.id, name="Marina", email="marina@paisagismo.com", discipline="landscape"))
        db_session.commit()
        _source(db_session, project, source_type="email", title="Irrigação", email_thread_id="t1", ingestion_status="processed")
        source = _source(db_session, project, source_type="email", title="RE: Irrigação", email_thread_id="t1", email_from="Marina <marina@paisagismo.com>", email_to=["gabriela@soubim.com"])
        reasons = routing(db_session, source)["reasons"]
        assert {"code": "email_participant", "who": "Marina"} in reasons
        assert {"code": "email_thread"} in reasons

    def test_title_only_is_medium_and_nothing_is_low(self, db_session: Session):
        project = _project(db_session)
        titled = _source(db_session, project, title="Residential Tower Alpha · semanal")
        assert routing(db_session, titled)["confidence"] == "medium"
        bare = _source(db_session, project, title="Conversa")
        assert routing(db_session, bare) == {"confidence": "low", "reasons": []}
        assert {"kind": "warn", "code": "lowConfidence"} in flags(db_session, bare, "low")


class TestFlags:
    def test_external_participants_by_domain(self, db_session: Session):
        _user(db_session, "gabriela@soubim.com")
        project = _project(db_session)
        source = _source(db_session, project, participants=[{"name": "Gabriela", "email": "gabriela@soubim.com"}, {"name": "Ana", "email": "ana@cliente.com"}])
        assert {"kind": "info", "code": "external", "count": 1, "names": ["Ana"]} in flags(db_session, source, "high")

    def test_possible_duplicate(self, db_session: Session):
        project = _project(db_session)
        _source(db_session, project, title="Reunião semanal", occurred_at=NOW - timedelta(hours=2), ingestion_status="processed")
        source = _source(db_session, project, title="reunião semanal")
        [flag] = [f for f in flags(db_session, source, "high") if f["code"] == "duplicate"]
        assert flag["kind"] == "warn" and flag["title"] == "Reunião semanal"


class TestPreview:
    def test_meeting_turns(self, db_session: Session):
        project = _project(db_session)
        source = _source(db_session, project, raw_content="Título\n0:05 - Ana (cliente)\n  Precisamos abrir as lojas.\n  Em setembro.\n2:10 - ⚠️ Carlos [vozes]\n  Antes, as vigas.\n3:00 - Lucia\n  Ok.\n4:00 - Miguel\n  Fim.")
        assert preview(source) == [
            {"at": "0:05", "who": "Ana", "text": "Precisamos abrir as lojas. Em setembro."},
            {"at": "2:10", "who": "Carlos", "text": "Antes, as vigas."},
            {"at": "3:00", "who": "Lucia", "text": "Ok."},
        ]

    def test_email_header_and_text(self, db_session: Session):
        project = _project(db_session)
        source = _source(db_session, project, source_type="email", email_from="marina@x.com", email_to=["g@soubim.com"], raw_content="Seguem as zonas\n revisadas.")
        assert preview(source) == [{"at": None, "who": "from_to", "text": "marina@x.com → g@soubim.com"}, {"at": None, "who": "text", "text": "Seguem as zonas revisadas."}]


class TestCandidatePreview:
    def test_clean_candidates(self):
        assert candidate_preview.clean_candidates(
            [{"type": "decision", "title": " C50 nos pilares ", "discipline": "structural"}, {"type": "x", "title": "y", "discipline": "z"}, {"title": ""}, "bad"]
        ) == [{"type": "decision", "title": "C50 nos pilares", "discipline": "structural"}, {"type": "information", "title": "y", "discipline": "general"}]

    def test_generate_stores_candidates_and_missing_summary(self, db_session: Session):
        project = _project(db_session)
        source = _source(db_session, project, raw_content="0:05 - Carlos\n  C50 nos pilares.")
        reply = json.dumps({"summary": "Definição do concreto.", "items": [{"type": "decision", "title": "Concreto C50", "discipline": "structural"}]})
        client = SimpleNamespace(messages=SimpleNamespace(create=lambda **kw: SimpleNamespace(content=[SimpleNamespace(text=f"```json\n{reply}\n```")])))
        assert candidate_preview.generate(db_session, source, client=client) == [{"type": "decision", "title": "Concreto C50", "discipline": "structural"}]
        assert source.ai_summary == "Definição do concreto."
        assert source.candidates_at is not None

    def test_new_pending_sources_queue_a_preview(self, db_session: Session, monkeypatch):
        monkeypatch.setattr(candidate_preview, "preview_enabled", lambda: True)
        project = _project(db_session)
        source = _source(db_session, project)
        [job] = db_session.query(Job).filter(Job.type == "preview_candidates").all()
        assert job.payload == {"source_id": str(source.id)}
        assert job.source_id is None  # a failed preview never marks the source failed
        _source(db_session, project, ingestion_status="processed")
        assert db_session.query(Job).filter(Job.type == "preview_candidates").count() == 1

    def test_off_in_tests_by_default(self, db_session: Session):
        _source(db_session, _project(db_session))
        assert db_session.query(Job).filter(Job.type == "preview_candidates").count() == 0


@pytest.fixture
def client(pg_session):
    from app.main import app

    return TestClient(app)


def _auth(user):
    return {"Authorization": "Bearer " + create_access_token(str(user.id), user.email, user.role)}


class TestDecisions:
    def test_list_carries_insights(self, client, pg_session: Session):
        user = _user(pg_session)
        project = _project(pg_session)
        source = _source(pg_session, project, candidates=[{"type": "decision", "title": "C50", "discipline": "structural"}], candidates_at=NOW)
        [row] = client.get("/api/ingestion", headers=_auth(user)).json()["sources"]
        assert row["id"] == str(source.id)
        assert row["routing"]["confidence"] == "low"
        assert row["candidates"] == [{"type": "decision", "title": "C50", "discipline": "structural"}]
        assert row["candidates_ready"] is True
        assert {"kind": "warn", "code": "lowConfidence"} in row["flags"]

    def test_approve_into_another_project_waits_for_the_undo_window(self, client, pg_session: Session):
        user = _user(pg_session)
        first, second = _project(pg_session), _project(pg_session, name="Commercial Plaza Beta")
        source = _source(pg_session, first)
        before = datetime.utcnow()
        response = client.patch(f"/api/ingestion/{source.id}", headers=_auth(user), json={"ingestion_status": "approved", "project_id": str(second.id)})
        assert response.status_code == 200
        pg_session.expire_all()
        assert str(pg_session.get(Source, source.id).project_id) == str(second.id)
        [job] = pg_session.query(Job).filter(Job.type == "process_source").all()
        assert job.run_after >= before + timedelta(seconds=5)

    def test_approving_twice_queues_one_extraction(self, client, pg_session: Session):
        user = _user(pg_session)
        source = _source(pg_session, _project(pg_session))
        for _ in range(2):
            client.patch(f"/api/ingestion/{source.id}", headers=_auth(user), json={"ingestion_status": "approved"})
        assert pg_session.query(Job).filter(Job.type == "process_source").count() == 1

    def test_undo_while_queued_and_too_late_once_running(self, client, pg_session: Session):
        user = _user(pg_session)
        project = _project(pg_session)
        queued, running, rejected = _source(pg_session, project), _source(pg_session, project, title="B"), _source(pg_session, project, title="C")
        client.post("/api/ingestion/batch", headers=_auth(user), json={"source_ids": [str(queued.id), str(running.id)], "action": "approve"})
        client.patch(f"/api/ingestion/{rejected.id}", headers=_auth(user), json={"ingestion_status": "rejected"})
        pg_session.expire_all()
        job = pg_session.query(Job).filter(Job.source_id == running.id).one()
        job.status = "running"
        pg_session.commit()

        result = client.post("/api/ingestion/undo", headers=_auth(user), json={"source_ids": [str(queued.id), str(running.id), str(rejected.id)]}).json()
        assert sorted(result["undone"]) == sorted([str(queued.id), str(rejected.id)])
        assert result["too_late"] == [str(running.id)]
        pg_session.expire_all()
        assert pg_session.get(Source, queued.id).ingestion_status == "pending"
        assert pg_session.get(Source, rejected.id).ingestion_status == "pending"
        assert pg_session.query(Job).filter(Job.source_id == queued.id).count() == 0
