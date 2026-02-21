"""Tests for project service and endpoints."""

import pytest
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.database.models import User, Project, ProjectMember, ProjectItem, Transcript

# Backward compatibility alias
Decision = ProjectItem
from app.services.project_service import (
    get_projects,
    get_project,
    ProjectNotFoundError,
    PermissionDeniedError,
)
from app.utils.security import hash_password


@pytest.fixture
def director_user(db_session: Session) -> User:
    """Create a director user."""
    user = User(
        email="director@example.com",
        password_hash=hash_password("password"),
        name="Director User",
        role="director",
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def architect_user(db_session: Session) -> User:
    """Create an architect user."""
    user = User(
        email="architect@example.com",
        password_hash=hash_password("password"),
        name="Architect User",
        role="architect",
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def test_projects(
    db_session: Session, director_user: User, architect_user: User
) -> tuple:
    """Create test projects with members and decisions."""
    # Create 3 projects with explicit timestamps for predictable sorting
    from datetime import timedelta
    base_time = datetime.utcnow()

    project1 = Project(
        name="Project Alpha",
        description="First project",
        created_at=base_time - timedelta(hours=2)  # Oldest
    )
    project2 = Project(
        name="Project Beta",
        description="Second project",
        created_at=base_time - timedelta(hours=1)  # Middle
    )
    project3 = Project(
        name="Project Gamma",
        description="Third project",
        created_at=base_time  # Most recent
    )
    db_session.add_all([project1, project2, project3])
    db_session.commit()

    # Add director to all projects
    member_d1 = ProjectMember(project_id=project1.id, user_id=director_user.id, role="owner")
    member_d2 = ProjectMember(project_id=project2.id, user_id=director_user.id, role="owner")
    member_d3 = ProjectMember(project_id=project3.id, user_id=director_user.id, role="owner")

    # Add architect to only project 1
    member_a1 = ProjectMember(project_id=project1.id, user_id=architect_user.id, role="member")

    db_session.add_all([member_d1, member_d2, member_d3, member_a1])
    db_session.commit()

    # Add decisions to project 1
    transcript1 = Transcript(
        project_id=project1.id,
        meeting_id="meet_001",
        meeting_type="multi-disciplinary",
        participants=[],
        transcript_text="Test transcript",
        meeting_date=datetime.utcnow(),
    )
    db_session.add(transcript1)
    db_session.commit()

    # Add some decisions
    decision1 = Decision(
        project_id=project1.id,
        transcript_id=transcript1.id,
        decision_statement="Decision 1",
        who="User",
        timestamp="00:00:00",
        discipline="architecture",
        why="Testing",
        consensus={"architecture": "AGREE"},
        created_at=datetime.utcnow(),
    )
    decision2 = Decision(
        project_id=project1.id,
        transcript_id=transcript1.id,
        decision_statement="Decision 2",
        who="User",
        timestamp="00:05:00",
        discipline="mep",
        why="Testing",
        consensus={"mep": "AGREE"},
        created_at=datetime.utcnow() - timedelta(days=15),  # Older than 7 days
    )
    decision3 = Decision(
        project_id=project1.id,
        transcript_id=transcript1.id,
        decision_statement="Decision 3",
        who="User",
        timestamp="00:10:00",
        discipline="structural",
        why="Testing",
        consensus={"structural": "AGREE"},
        created_at=datetime.utcnow() - timedelta(hours=2),  # Within 7 days
    )

    db_session.add_all([decision1, decision2, decision3])
    db_session.commit()

    return project1, project2, project3


class TestGetProjects:
    """Tests for get_projects service function."""

    def test_director_sees_all_projects(
        self, db_session: Session, director_user: User, test_projects: tuple
    ):
        """Director should see all projects."""
        projects, total = get_projects(db_session, str(director_user.id))
        assert total == 3
        assert len(projects) == 3

    def test_architect_sees_assigned_projects(
        self, db_session: Session, architect_user: User, test_projects: tuple
    ):
        """Architect should see only assigned projects."""
        projects, total = get_projects(db_session, str(architect_user.id))
        assert total == 1
        assert len(projects) == 1
        assert projects[0]["name"] == "Project Alpha"

    def test_pagination_working(
        self, db_session: Session, director_user: User, test_projects: tuple
    ):
        """Pagination should work correctly."""
        # Get first page
        projects1, total = get_projects(db_session, str(director_user.id), limit=2, offset=0)
        assert len(projects1) == 2
        assert total == 3

        # Get second page
        projects2, total = get_projects(db_session, str(director_user.id), limit=2, offset=2)
        assert len(projects2) == 1
        assert total == 3

    def test_sorting_by_created_at(
        self, db_session: Session, director_user: User, test_projects: tuple
    ):
        """Projects should be sorted by created_at DESC."""
        projects, _ = get_projects(db_session, str(director_user.id))
        # Most recent first
        assert projects[0]["name"] == "Project Gamma"
        assert projects[1]["name"] == "Project Beta"
        assert projects[2]["name"] == "Project Alpha"

    def test_project_metadata_included(
        self, db_session: Session, director_user: User, test_projects: tuple
    ):
        """Project response should include metadata."""
        projects, _ = get_projects(db_session, str(director_user.id))
        project = projects[0]

        assert "id" in project
        assert "name" in project
        assert "description" in project
        assert "created_at" in project
        assert "member_count" in project
        assert "decision_count" in project


class TestGetProject:
    """Tests for get_project service function."""

    def test_get_project_with_stats(
        self, db_session: Session, director_user: User, test_projects: tuple
    ):
        """Project detail should include statistics."""
        project = get_project(db_session, str(test_projects[0].id), str(director_user.id))

        assert project["name"] == "Project Alpha"
        assert project["stats"]["total_decisions"] == 3
        assert project["stats"]["decisions_last_week"] == 2  # 2 within 7 days
        assert "architecture" in project["stats"]["decisions_by_discipline"]
        assert project["stats"]["decisions_by_discipline"]["architecture"] == 1

    def test_get_project_members(
        self, db_session: Session, director_user: User, test_projects: tuple
    ):
        """Project detail should include members list."""
        project = get_project(db_session, str(test_projects[0].id), str(director_user.id))

        assert len(project["members"]) == 2
        member_names = [m["name"] for m in project["members"]]
        assert "Director User" in member_names
        assert "Architect User" in member_names

    def test_get_project_not_found(self, db_session: Session, director_user: User):
        """Should raise ProjectNotFoundError for non-existent project."""
        from uuid import uuid4

        with pytest.raises(ProjectNotFoundError):
            get_project(db_session, str(uuid4()), str(director_user.id))

    def test_architect_cannot_access_unassigned_project(
        self, db_session: Session, architect_user: User, test_projects: tuple
    ):
        """Architect should not access projects they're not assigned to."""
        with pytest.raises(PermissionDeniedError):
            get_project(db_session, str(test_projects[1].id), str(architect_user.id))

    def test_director_can_access_all_projects(
        self, db_session: Session, director_user: User, test_projects: tuple
    ):
        """Director should access all projects."""
        for project in test_projects:
            result = get_project(db_session, str(project.id), str(director_user.id))
            assert result["name"] == project.name

    def test_discipline_stats_accurate(
        self, db_session: Session, director_user: User, test_projects: tuple
    ):
        """Discipline statistics should be accurate."""
        project = get_project(db_session, str(test_projects[0].id), str(director_user.id))

        stats = project["stats"]["decisions_by_discipline"]
        assert stats["architecture"] == 1
        assert stats["mep"] == 1
        assert stats["structural"] == 1
        assert len(stats) == 3

    def test_meeting_type_stats(
        self, db_session: Session, director_user: User, test_projects: tuple
    ):
        """Meeting type statistics should be calculated."""
        project = get_project(db_session, str(test_projects[0].id), str(director_user.id))

        stats = project["stats"]["decisions_by_meeting_type"]
        assert "multi-disciplinary" in stats
        assert stats["multi-disciplinary"] == 3


class TestProjectRBAC:
    """Tests for role-based access control."""

    def test_director_full_access(
        self, db_session: Session, director_user: User, test_projects: tuple
    ):
        """Director should have full access."""
        # Can list all projects
        projects, total = get_projects(db_session, str(director_user.id))
        assert total == 3

        # Can access any project details
        for project in test_projects:
            result = get_project(db_session, str(project.id), str(director_user.id))
            assert result is not None

    def test_architect_partial_access(
        self, db_session: Session, architect_user: User, test_projects: tuple
    ):
        """Architect should only access assigned projects."""
        # Can only list assigned projects
        projects, total = get_projects(db_session, str(architect_user.id))
        assert total == 1

        # Can access assigned project
        result = get_project(db_session, str(test_projects[0].id), str(architect_user.id))
        assert result is not None

        # Cannot access other projects
        with pytest.raises(PermissionDeniedError):
            get_project(db_session, str(test_projects[1].id), str(architect_user.id))

    def test_role_in_project_metadata(
        self, db_session: Session, director_user: User, test_projects: tuple
    ):
        """Project members should show their role."""
        project = get_project(db_session, str(test_projects[0].id), str(director_user.id))

        roles = {m["name"]: m["role"] for m in project["members"]}
        assert roles["Director User"] == "owner"
        assert roles["Architect User"] == "member"


class TestProjectStatistics:
    """Tests for project statistics calculations."""

    def test_total_decisions_count(
        self, db_session: Session, director_user: User, test_projects: tuple
    ):
        """Total decisions should be accurate."""
        project = get_project(db_session, str(test_projects[0].id), str(director_user.id))
        assert project["stats"]["total_decisions"] == 3

    def test_decisions_last_week(
        self, db_session: Session, director_user: User, test_projects: tuple
    ):
        """Decisions last 7 days should be accurate."""
        project = get_project(db_session, str(test_projects[0].id), str(director_user.id))
        # 2 decisions within 7 days (created_at now and now - 2 hours)
        # 1 decision older than 7 days (created_at now - 15 days)
        assert project["stats"]["decisions_last_week"] == 2

    def test_decisions_by_discipline_breakdown(
        self, db_session: Session, director_user: User, test_projects: tuple
    ):
        """Discipline breakdown should be accurate."""
        project = get_project(db_session, str(test_projects[0].id), str(director_user.id))
        stats = project["stats"]["decisions_by_discipline"]

        assert stats["architecture"] == 1
        assert stats["mep"] == 1
        assert stats["structural"] == 1

    def test_decisions_by_meeting_type_breakdown(
        self, db_session: Session, director_user: User, test_projects: tuple
    ):
        """Meeting type breakdown should be accurate."""
        project = get_project(db_session, str(test_projects[0].id), str(director_user.id))
        stats = project["stats"]["decisions_by_meeting_type"]

        assert "multi-disciplinary" in stats
        assert stats["multi-disciplinary"] >= 1
