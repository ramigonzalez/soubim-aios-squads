"""Tests for Fathom routing rules per project (Story 13.16).

Rule CRUD and its permissions, and webhook routing: one match imports, no match / two matches park
the meeting as Unassigned (``no_match`` / ``conflict``). No real call reaches Fathom.
"""

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.api.routes import fathom as fathom_routes
from app.api.routes import fathom_rules as routes
from app.database.models import FathomImport, FathomUnassignedMeeting, Project, ProjectFathomRule, User
from app.integrations import fathom
from app.services import fathom_rules
from tests.org_helpers import assign_to_project, make_org, make_org_member
from tests.unit.test_fathom import configured, fake, make_connection  # noqa: F401 (fixtures)
from tests.unit.test_fathom_webhook import PAYLOAD, add_rule, client, conn, deliver, org, project, user  # noqa: F401
from tests.unit.test_recording_storage import fake_s3  # noqa: F401 (fixture)


def new_user(db: Session, email: str, org, role: str) -> User:
    u = User(email=email, password_hash="x", name=email.split("@")[0], role="architect")
    db.add(u)
    make_org_member(db, u, role, org)
    db.commit()
    return u


def create(db, user, project, field="title", value="Coordenação"):
    return routes.create_rule(str(project.id), routes.RuleCreate(field=field, value=value), db=db, user=user)


# --------------------------------------------------------------------------- CRUD


class TestRuleCrud:
    def test_create_list_and_delete(self, db_session, user, project):
        created = create(db_session, user, project, "participant_domain", "  Cliente.com.br ")
        assert (created["field"], created["operator"], created["value"]) == ("participant_domain", "equals", "Cliente.com.br")
        create(db_session, user, project, "title", "D/SEASON")
        listed = routes.list_rules(str(project.id), db=db_session, user=user)
        assert [(r["field"], r["operator"], r["value"]) for r in listed] == [
            ("participant_domain", "equals", "Cliente.com.br"), ("title", "contains", "D/SEASON")]
        routes.delete_rule(str(project.id), created["id"], db=db_session, user=user)
        assert [r["value"] for r in routes.list_rules(str(project.id), db=db_session, user=user)] == ["D/SEASON"]

    def test_created_by_is_recorded(self, db_session, user, project):
        create(db_session, user, project)
        assert db_session.query(ProjectFathomRule).one().created_by == user.id

    @pytest.mark.parametrize("field,value", [
        ("title", ""), ("title", "   "), ("title", "x" * 201),
        ("participant_domain", "@cliente.com"), ("participant_domain", "a@b.com"), ("participant_domain", "a b.com"),
        ("participant_email", "no-at-sign"), ("participant_email", "@cliente.com"), ("participant_email", "a@b@c"),
    ])
    def test_values_are_validated(self, db_session, user, project, field, value):
        with pytest.raises(HTTPException) as exc:
            create(db_session, user, project, field, value)
        assert exc.value.status_code == 422
        assert db_session.query(ProjectFathomRule).count() == 0

    def test_200_characters_is_allowed(self, db_session, user, project):
        assert len(create(db_session, user, project, "title", "  " + "x" * 200 + " ")["value"]) == 200

    def test_unknown_field_is_refused(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            routes.RuleCreate(field="organizer", value="x")

    def test_duplicate_rule_is_a_conflict(self, db_session, user, project):
        create(db_session, user, project, "participant_email", "Ana@Cliente.com")
        with pytest.raises(HTTPException) as exc:
            create(db_session, user, project, "participant_email", " ana@cliente.COM ")
        assert exc.value.status_code == 409
        create(db_session, user, project, "title", "ana@cliente.com")  # same text, other field: fine

    def test_rules_go_with_the_project(self, db_session, user, project):
        create(db_session, user, project)
        db_session.delete(project)
        db_session.commit()
        assert db_session.query(ProjectFathomRule).count() == 0

    def test_delete_of_a_rule_of_another_project_is_not_found(self, db_session, org, user, project):
        other = Project(owner_organization_id=org.id, name="Obra X")
        db_session.add(other)
        db_session.commit()
        rule = create(db_session, user, other)
        for rule_id in (rule["id"], "not-a-uuid", "00000000-0000-0000-0000-000000000000"):
            with pytest.raises(HTTPException) as exc:
                routes.delete_rule(str(project.id), rule_id, db=db_session, user=user)
            assert exc.value.status_code == 404
        assert db_session.query(ProjectFathomRule).count() == 1


class TestRulePermissions:
    def test_assigned_reviewer_can_manage_rules(self, db_session, org, project):
        reviewer = new_user(db_session, "rev@soubim.com", org, "reviewer")
        assign_to_project(db_session, reviewer, project)
        db_session.commit()
        rule = create(db_session, reviewer, project)
        assert len(routes.list_rules(str(project.id), db=db_session, user=reviewer)) == 1
        routes.delete_rule(str(project.id), rule["id"], db=db_session, user=reviewer)

    @pytest.mark.parametrize("role,assigned", [("member", True), ("reviewer", False), ("member", False)])
    def test_others_get_403(self, db_session, org, user, project, role, assigned):
        rule = create(db_session, user, project)
        someone = new_user(db_session, f"{role}{assigned}@soubim.com", org, role)
        if assigned:
            assign_to_project(db_session, someone, project)
            db_session.commit()
        for call in (
            lambda: routes.list_rules(str(project.id), db=db_session, user=someone),
            lambda: create(db_session, someone, project, "title", "Nova"),
            lambda: routes.delete_rule(str(project.id), rule["id"], db=db_session, user=someone),
        ):
            with pytest.raises(HTTPException) as exc:
                call()
            assert exc.value.status_code == 403
        assert db_session.query(ProjectFathomRule).count() == 1

    def test_admin_of_another_organization_gets_403(self, db_session, project):
        outsider = new_user(db_session, "x@dimas.com", make_org(db_session, "DIMAS"), "admin")
        with pytest.raises(HTTPException) as exc:
            routes.list_rules(str(project.id), db=db_session, user=outsider)
        assert exc.value.status_code == 403

    def test_endpoints_need_a_login(self, client, project):
        assert client.get(f"/api/projects/{project.id}/fathom-rules").status_code in (401, 403)


# --------------------------------------------------------------------------- matching


class TestMatching:
    def facts(self, payload):
        return fathom_rules.meeting_facts(payload)

    def rule(self, field, value):
        return ProjectFathomRule(field=field, operator=fathom_rules.OPERATORS[field], value=value)

    def test_title_contains_is_case_insensitive_and_ignores_whitespace(self):
        facts = self.facts({"title": "  Reunião   D/SEASON  semanal "})
        assert fathom_rules.rule_matches(self.rule("title", "  d/season "), facts)
        assert fathom_rules.rule_matches(self.rule("title", "REUNIÃO d/season"), facts)
        assert not fathom_rules.rule_matches(self.rule("title", "Obra X"), facts)

    def test_meeting_title_is_used_when_title_is_missing(self):
        assert fathom_rules.rule_matches(self.rule("title", "obra"), self.facts({"meeting_title": "Obra X"}))

    def test_emails_and_domains_of_invitees_and_recorder(self):
        facts = self.facts({
            "calendar_invitees": [{"email": " Ana@Cliente.com.br "}, {"name": "no email"}, "junk", {"email_domain": "@Parceiro.com"}],
            "recorded_by": {"email": "rami@soubim.com"},
        })
        assert facts.emails == {"ana@cliente.com.br", "rami@soubim.com"}
        assert facts.domains == {"cliente.com.br", "soubim.com", "parceiro.com"}
        assert fathom_rules.rule_matches(self.rule("participant_email", "ANA@cliente.com.br"), facts)
        assert fathom_rules.rule_matches(self.rule("participant_domain", "Cliente.com.br"), facts)
        assert fathom_rules.rule_matches(self.rule("participant_domain", "parceiro.com"), facts)
        assert not fathom_rules.rule_matches(self.rule("participant_domain", "com.br"), facts)  # equals, not suffix

    @pytest.mark.parametrize("payload", [
        None, [], "text", {}, {"title": None}, {"title": 5}, {"calendar_invitees": "a@b.com"},
        {"calendar_invitees": [None, 3, {"email": None}, {"email": ["a@b.com"]}]}, {"recorded_by": "a@b.com"},
    ])
    def test_missing_or_malformed_fields_are_no_match(self, payload):
        facts = self.facts(payload)
        for field, value in (("title", "a"), ("participant_email", "a@b.com"), ("participant_domain", "b.com")):
            assert not fathom_rules.rule_matches(self.rule(field, value), facts)


# --------------------------------------------------------------------------- routing on webhook arrival


@pytest.fixture
def second(db_session: Session, org) -> Project:
    p = Project(owner_organization_id=org.id, name="Obra X")
    db_session.add(p)
    db_session.commit()
    return p


class TestRouting:
    """``conn`` (from the 13.9 tests) has a rule ``title contains "Coordenação"`` on ``project`` (D/SEASON)."""

    def test_one_match_is_imported_into_that_project(self, client, db_session, project, second, conn):
        add_rule(db_session, second, "title", "Obra X")
        assert deliver(client, conn.id).json() == {"status": "imported"}
        assert db_session.query(FathomImport).one().project_id == project.id
        assert db_session.query(FathomUnassignedMeeting).count() == 0

    def test_match_by_participant_domain(self, client, db_session, second, conn):
        db_session.query(ProjectFathomRule).delete()
        add_rule(db_session, second, "participant_domain", "Cliente.com.br")
        payload = {**PAYLOAD, "calendar_invitees": [{"name": "Ana", "email": "ana@cliente.com.br"}]}
        assert deliver(client, conn.id, payload).json() == {"status": "imported"}
        assert db_session.query(FathomImport).one().project_id == second.id

    def test_match_by_recorder_email(self, client, db_session, second, conn):
        db_session.query(ProjectFathomRule).delete()
        add_rule(db_session, second, "participant_email", "RAMI@example.com")
        assert deliver(client, conn.id).json() == {"status": "imported"}
        assert db_session.query(FathomImport).one().project_id == second.id

    def test_no_match_is_parked(self, client, db_session, second, conn):
        db_session.query(ProjectFathomRule).delete()
        add_rule(db_session, second, "title", "Obra X")
        assert deliver(client, conn.id).json() == {"status": "unassigned"}
        row = db_session.query(FathomUnassignedMeeting).one()
        assert (row.reason, row.matched_project_ids) == ("no_match", None)
        assert db_session.query(FathomImport).count() == 0

    def test_two_matches_are_a_conflict_with_the_matched_projects(self, client, db_session, user, project, second, conn):
        add_rule(db_session, second, "participant_email", "rami@example.com")
        assert deliver(client, conn.id).json() == {"status": "unassigned"}
        row = db_session.query(FathomUnassignedMeeting).one()
        assert row.reason == "conflict"
        assert set(row.matched_project_ids) == {str(project.id), str(second.id)}
        assert db_session.query(FathomImport).count() == 0
        listed = fathom_routes.fathom_unassigned(db=db_session, user=user)
        assert listed[0]["reason"] == "conflict"
        assert listed[0]["matched_projects"] == [
            {"id": str(project.id), "name": "D/SEASON"}, {"id": str(second.id), "name": "Obra X"}]

    def test_two_rules_of_one_project_are_one_match(self, client, db_session, project, conn):
        add_rule(db_session, project, "participant_email", "rami@example.com")
        assert deliver(client, conn.id).json() == {"status": "imported"}

    def test_matched_projects_the_user_lost_access_to_are_not_listed(self, client, db_session, org, user, project, second, conn):
        add_rule(db_session, second, "title", "semanal")
        deliver(client, conn.id)
        foreign_org = make_org(db_session, "DIMAS")
        second.owner_organization_id = foreign_org.id
        db_session.commit()
        listed = fathom_routes.fathom_unassigned(db=db_session, user=user)
        assert [p["name"] for p in listed[0]["matched_projects"]] == ["D/SEASON"]

    def test_archived_project_is_not_a_candidate(self, client, db_session, project, second, conn):
        add_rule(db_session, second, "title", "semanal")
        second.archived_at = fathom.utcnow()
        db_session.commit()
        assert deliver(client, conn.id).json() == {"status": "imported"}
        assert db_session.query(FathomImport).one().project_id == project.id

    def test_project_without_write_access_is_not_a_candidate(self, client, db_session, project, conn):
        foreign = Project(owner_organization_id=make_org(db_session, "DIMAS").id, name="Alheio")
        db_session.add(foreign)
        db_session.commit()
        add_rule(db_session, foreign, "title", "semanal")  # rule of a project the user cannot write to
        assert deliver(client, conn.id).json() == {"status": "imported"}
        assert db_session.query(FathomImport).one().project_id == project.id

    def test_shared_in_project_is_not_a_candidate(self, client, db_session, project, conn):
        """12.13 audit H1: another organization's rules on a project shared with us never route our meetings."""
        from app.database.models import ProjectOrganization

        foreign = Project(owner_organization_id=make_org(db_session, "DIMAS").id, name="Projeto DIMAS")
        db_session.add(foreign)
        db_session.flush()
        db_session.add(ProjectOrganization(project_id=foreign.id, organization_id=project.owner_organization_id,
                                           access="contributor"))
        db_session.commit()
        add_rule(db_session, foreign, "title", "a")  # broad rule set by the other organization
        assert deliver(client, conn.id).json() == {"status": "imported"}
        assert db_session.query(FathomImport).one().project_id == project.id

    def test_only_a_shared_in_match_is_no_match(self, client, db_session, project, conn):
        from app.database.models import ProjectOrganization

        db_session.query(ProjectFathomRule).delete()
        foreign = Project(owner_organization_id=make_org(db_session, "DIMAS").id, name="Projeto DIMAS")
        db_session.add(foreign)
        db_session.flush()
        db_session.add(ProjectOrganization(project_id=foreign.id, organization_id=project.owner_organization_id,
                                           access="contributor"))
        db_session.commit()
        add_rule(db_session, foreign, "title", "a")
        assert deliver(client, conn.id).json() == {"status": "unassigned"}
        assert db_session.query(FathomUnassignedMeeting).one().reason == "no_match"
        assert db_session.query(FathomImport).count() == 0

    def test_case_insensitive_title_match(self, client, db_session, project, conn):
        db_session.query(ProjectFathomRule).delete()
        add_rule(db_session, project, "title", "  COORDENAÇÃO SEMANAL ")
        assert deliver(client, conn.id).json() == {"status": "imported"}

    def test_payload_without_title_or_people_is_no_match_not_an_error(self, client, db_session, conn):
        response = deliver(client, conn.id, {"recording_id": 777003})
        assert response.status_code == 202 and response.json() == {"status": "unassigned"}
        assert db_session.query(FathomUnassignedMeeting).one().reason == "no_match"

    def test_assign_a_conflict_to_one_of_the_matched_projects(self, client, db_session, user, project, second, conn):
        add_rule(db_session, second, "title", "semanal")
        deliver(client, conn.id)
        item = fathom_routes.fathom_unassigned(db=db_session, user=user)[0]
        fathom_routes.fathom_assign_unassigned(
            item["id"], fathom_routes.AssignRequest(project_id=str(second.id)), db=db_session, user=user)
        assert db_session.query(FathomImport).one().project_id == second.id
        assert db_session.query(FathomUnassignedMeeting).count() == 0
