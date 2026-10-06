"""SQLAlchemy ORM models for database tables.

V2 Migration (Story 5.1): Decision → ProjectItem taxonomy.
- decisions table renamed to project_items
- New tables: sources, project_participants
- Decision class kept as alias for backward compatibility
"""

import uuid

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    TypeDecorator,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PGUID
from sqlalchemy import event
from sqlalchemy.sql import false as sql_false
from sqlalchemy.orm import Session, declarative_base, relationship

try:
    from pgvector.sqlalchemy import Vector as VECTOR
except ImportError:
    VECTOR = String

# Use JSON for SQLite compatibility
JSONType = JSON

# Create a hybrid UUID type that works with both PostgreSQL and SQLite
class GUID(TypeDecorator):
    """Platform-independent GUID type that uses CHAR(32) on SQLite and UUID on PostgreSQL."""
    impl = String
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(PGUID(as_uuid=True))
        return dialect.type_descriptor(String(32))

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if dialect.name == 'postgresql':
            return str(value) if not isinstance(value, uuid.UUID) else value
        # For SQLite, convert to hex without hyphens
        if isinstance(value, uuid.UUID):
            return value.hex
        elif isinstance(value, str):
            try:
                return uuid.UUID(value).hex
            except (ValueError, AttributeError):
                return value
        return value

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, uuid.UUID):
            return value
        if isinstance(value, str):
            if len(value) == 32:
                return uuid.UUID(hex=value)
            else:
                return uuid.UUID(value)
        return value

Base = declarative_base()


class User(Base):
    """User model for authentication."""

    __tablename__ = "users"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)
    created_at = Column(DateTime, nullable=False, default=func.now())
    last_login_at = Column(DateTime)
    deleted_at = Column(DateTime)

    __table_args__ = (
        CheckConstraint("role IN ('director', 'architect', 'client')", name="ck_user_role"),
        Index("idx_users_email", "email"),
        Index("idx_users_role", "role"),
        Index("idx_users_deleted", "deleted_at"),
    )


class Organization(Base):
    """A company using DecisionLog (Story 12.1): souBIM, DIMAS, future AEC firms.

    Every company is an organization; none is special-cased. Organizations own
    projects and (Story 12.4) meetings; projects can be shared between them (12.3).
    """

    __tablename__ = "organizations"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    created_at = Column(DateTime, nullable=False, default=func.now())

    members = relationship("OrganizationMember", back_populates="organization", cascade="all, delete-orphan")


class OrganizationMember(Base):
    """A user's membership and role in an organization (Story 12.1)."""

    __tablename__ = "organization_members"

    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    organization_id = Column(GUID(), ForeignKey("organizations.id", ondelete="CASCADE"), primary_key=True)
    role = Column(String(20), nullable=False, default="member")
    created_at = Column(DateTime, nullable=False, default=func.now())

    organization = relationship("Organization", back_populates="members")

    __table_args__ = (
        CheckConstraint("role IN ('owner', 'admin', 'reviewer', 'member')", name="ck_organization_member_role"),
        Index("idx_organization_members_org", "organization_id"),
    )


class OrganizationInvitation(Base):
    """Invitation to join an organization by email (Story 12.5).

    Only the SHA-256 of the token is stored; the raw token exists in the invite link only.
    ``organization_id`` is NULL for a company that has no organization yet: the organization
    named ``organization_name`` is created on acceptance and the invitee becomes its ``owner``.
    """

    __tablename__ = "organization_invitations"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID(), ForeignKey("organizations.id", ondelete="CASCADE"))
    organization_name = Column(String(255))
    email = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="member")
    token_hash = Column(String(64), unique=True, nullable=False)
    invited_by = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"))
    expires_at = Column(DateTime, nullable=False)
    accepted_at = Column(DateTime)
    revoked_at = Column(DateTime)
    created_at = Column(DateTime, nullable=False, default=func.now())

    organization = relationship("Organization")

    __table_args__ = (
        CheckConstraint("role IN ('owner', 'admin', 'reviewer', 'member')", name="ck_organization_invitation_role"),
        CheckConstraint(
            "organization_id IS NOT NULL OR organization_name IS NOT NULL", name="ck_organization_invitation_target"
        ),
        Index("idx_organization_invitations_org", "organization_id"),
        Index("idx_organization_invitations_email", "email"),
    )


class Project(Base):
    """Project model for architectural projects."""

    __tablename__ = "projects"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    project_type = Column(String(100))  # V2: residential, commercial, mixed-use, etc.
    actual_stage_id = Column(GUID())    # V2: FK to project_stages (added in future migration)
    # Story 12.1: organization that owns the project; Story 12.2: required (authorization is org-scoped)
    owner_organization_id = Column(GUID(), ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=func.now())
    archived_at = Column(DateTime)

    # Google Drive monitoring (Story 10.3)
    drive_folder_id = Column(String(255))
    last_drive_poll = Column(DateTime)

    # Relationships
    items = relationship("ProjectItem", back_populates="project", cascade="all, delete-orphan")
    sources = relationship("Source", back_populates="project", cascade="all, delete-orphan")
    participants = relationship("ProjectParticipant", back_populates="project", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_projects_created", "created_at"),
        Index("idx_projects_archived", "archived_at"),
        Index("idx_projects_owner_org", "owner_organization_id"),
    )


class ProjectMember(Base):
    """Project membership model."""

    __tablename__ = "project_members"

    project_id = Column(GUID(), ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role = Column(String(50), nullable=False)
    created_at = Column(DateTime, nullable=False, default=func.now())

    __table_args__ = (
        Index("idx_project_members_user", "user_id"),
    )


class ProjectOrganization(Base):
    """An organization with access to a project (Story 12.3).

    The owning organization has an ``owner`` row (mirrors ``projects.owner_organization_id``,
    which stays the source of truth for ownership). Other organizations are invited as
    ``contributor`` (read + add meetings/items) or ``viewer`` (read only).
    """

    __tablename__ = "project_organizations"

    project_id = Column(GUID(), ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True)
    organization_id = Column(GUID(), ForeignKey("organizations.id", ondelete="CASCADE"), primary_key=True)
    access = Column(String(20), nullable=False)
    invited_by = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(DateTime, nullable=False, default=func.now())

    organization = relationship("Organization")

    __table_args__ = (
        CheckConstraint("access IN ('owner', 'contributor', 'viewer')", name="ck_project_organization_access"),
        Index("idx_project_organizations_org", "organization_id"),
        Index(
            "uq_project_organizations_one_owner", "project_id", unique=True,
            postgresql_where=text("access = 'owner'"), sqlite_where=text("access = 'owner'"),
        ),
    )


class ProjectStage(Base):
    """Project stage schedule model (Story 6.1)."""

    __tablename__ = "project_stages"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    project_id = Column(GUID(), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    stage_name = Column(String(255), nullable=False)
    stage_from = Column(DateTime, nullable=False)
    stage_to = Column(DateTime, nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)

    __table_args__ = (
        Index("idx_project_stages_project", "project_id"),
    )


class StageTemplate(Base):
    """Predefined stage templates by project type (Story 6.1)."""

    __tablename__ = "stage_templates"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    project_type = Column(String(100), nullable=False)
    template_name = Column(String(255), nullable=False)
    stages = Column(JSONType, nullable=False)

    __table_args__ = (
        Index("idx_stage_templates_type", "project_type"),
    )


class Transcript(Base):
    """Transcript model for meeting recordings (V1 legacy — kept as read-only archive)."""

    __tablename__ = "transcripts"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    webhook_id = Column(String(255), unique=True)
    project_id = Column(GUID(), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    meeting_id = Column(String(255))
    meeting_type = Column(String(50))
    meeting_title = Column(String(255))
    participants = Column(JSONType, nullable=False)
    transcript_text = Column(Text, nullable=False)
    duration_minutes = Column(String)
    meeting_date = Column(DateTime, nullable=False)
    created_at = Column(DateTime, nullable=False, default=func.now())

    __table_args__ = (
        Index("idx_transcripts_project", "project_id"),
        Index("idx_transcripts_date", "meeting_date"),
        Index("idx_transcripts_type", "meeting_type"),
    )


class Source(Base):
    """Source model for meeting, email, document, and manual input sources (V2)."""

    __tablename__ = "sources"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    project_id = Column(GUID(), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    # Story 12.4: organization that owns the meeting (default: the project's owning organization,
    # set on flush) and who sees it — 'internal' (owner organization only) or 'shared' (every
    # organization with access to the project). Items of the source follow it.
    owner_organization_id = Column(GUID(), ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False)
    visibility = Column(String(20), nullable=False, default="internal", server_default="internal")
    source_type = Column(String(50), nullable=False)
    title = Column(String(500))
    occurred_at = Column(DateTime, nullable=False)
    ingestion_status = Column(String(50), nullable=False, default="pending")
    ai_summary = Column(Text)
    approved_by = Column(GUID(), ForeignKey("users.id"))
    approved_at = Column(DateTime)
    rejected_by = Column(GUID(), ForeignKey("users.id"))
    rejected_at = Column(DateTime)
    extraction_error = Column(Text)
    raw_content = Column(Text)

    # Meeting-specific
    meeting_type = Column(String(50))
    participants = Column(JSONType)
    duration_minutes = Column(Integer)
    webhook_id = Column(String(255))
    recording_url = Column(String(1000))  # Story 7.13: external recording link (e.g. Fathom share URL)

    # Email-specific
    email_from = Column(String(500))
    email_to = Column(JSONType)
    email_cc = Column(JSONType)
    email_thread_id = Column(String(255))

    # Document-specific
    file_url = Column(String(1000))
    file_type = Column(String(50))
    file_size = Column(Integer)
    drive_folder_id = Column(String(255))
    drive_file_id = Column(String(255), unique=True)  # Story 10.3: deduplication

    # Ingestion UI fields
    included = Column(Boolean, nullable=False, default=False)
    source_label = Column(String(100))  # "Fireflies", "Gmail", "Google Drive"

    # Curation workflow fields (Story 7.7)
    curation_status = Column(String(50), default="raw")  # raw → uploaded → curated → synced
    last_synced_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    # Relationships
    project = relationship("Project", back_populates="sources")
    items = relationship("ProjectItem", back_populates="source")

    __table_args__ = (
        CheckConstraint(
            "source_type IN ('meeting', 'email', 'document', 'manual_input')",
            name="ck_source_type_valid",
        ),
        CheckConstraint(
            "ingestion_status IN ('pending', 'approved', 'rejected', 'processed', 'failed')",
            name="ck_ingestion_status_valid",
        ),
        Index("idx_sources_project", "project_id"),
        Index("idx_sources_status", "ingestion_status"),
        Index("idx_sources_type", "source_type"),
        Index("idx_sources_occurred", "occurred_at"),
        Index("idx_sources_drive_file", "drive_file_id"),
        CheckConstraint("visibility IN ('internal', 'shared')", name="ck_source_visibility"),
        Index("idx_sources_owner_org", "owner_organization_id"),
    )


class Job(Base):
    """Background job picked up by the worker process (Story 13.2).

    The web API inserts jobs; `python -m app.worker` claims them with
    SELECT … FOR UPDATE SKIP LOCKED, so several workers never run the same job.
    """

    __tablename__ = "jobs"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    type = Column(String(50), nullable=False)
    payload = Column(JSONType, nullable=False, default=dict)
    status = Column(String(20), nullable=False, default="queued")
    attempts = Column(Integer, nullable=False, default=0)
    max_attempts = Column(Integer, nullable=False, default=3)
    run_after = Column(DateTime, nullable=False, default=func.now())
    locked_by = Column(String(100))
    locked_at = Column(DateTime)
    last_error = Column(Text)
    source_id = Column(GUID(), ForeignKey("sources.id", ondelete="CASCADE"))
    organization_id = Column(GUID(), ForeignKey("organizations.id", ondelete="SET NULL"))
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint("status IN ('queued', 'running', 'succeeded', 'failed')", name="ck_job_status"),
        Index("idx_jobs_claim", "status", "run_after"),
        Index("idx_jobs_source", "source_id"),
    )


class FathomConnection(Base):
    """A user's connected Fathom account (Story 13.3).

    Tokens are Fernet-encrypted at rest (app/utils/crypto.py). One connection per user:
    reconnecting replaces it, disconnecting deletes it. ``revoked_at`` is set when Fathom
    rejects the refresh token — the user must reconnect.
    """

    __tablename__ = "fathom_connections"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    organization_id = Column(GUID(), ForeignKey("organizations.id", ondelete="SET NULL"))
    access_token_enc = Column(Text, nullable=False)
    refresh_token_enc = Column(Text)
    expires_at = Column(DateTime)
    scope = Column(String(255))
    account_label = Column(String(255))
    connected_at = Column(DateTime, nullable=False, default=func.now())
    revoked_at = Column(DateTime)
    # Story 13.9: opt-in auto-import (off by default). The webhook is registered at Fathom with the
    # user's token; its signing secret is stored encrypted. Meetings go to the default project
    # (``internal`` unless chosen otherwise) or, without one, to the Unassigned list.
    auto_import_enabled = Column(Boolean, nullable=False, default=False, server_default=sql_false())
    auto_import_project_id = Column(GUID(), ForeignKey("projects.id", ondelete="SET NULL"))
    auto_import_visibility = Column(String(20), nullable=False, default="internal", server_default="internal")
    webhook_id = Column(String(128))  # Fathom's id of the registered webhook
    webhook_secret_enc = Column(Text)

    @property
    def needs_reconnect(self) -> bool:
        return self.revoked_at is not None


class FathomPendingConnection(Base):
    """Tokens from a Fathom callback waiting for the logged-in user to confirm (Story 13.3).

    The public callback cannot see who is logged in (the API and the frontend are on different
    origins), so it parks the tokens here and the frontend confirms with the user's JWT. Only the
    user named in the OAuth state can confirm — this stops an attacker from attaching a victim's
    Fathom account to the attacker's DecisionLog user (login CSRF).

    ``nonce`` is the opaque id sent to the frontend; ``state_nonce`` makes each OAuth state
    single use. After confirm (or a rejected confirm) the tokens are wiped and ``consumed_at`` set;
    the row then only burns the state until ``expires_at`` and is deleted opportunistically.
    """

    __tablename__ = "fathom_pending_connections"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    nonce = Column(String(64), nullable=False, unique=True)
    state_nonce = Column(String(64), nullable=False, unique=True)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)  # from the OAuth state
    access_token_enc = Column(Text)
    refresh_token_enc = Column(Text)
    token_expires_at = Column(DateTime)
    scope = Column(String(255))
    expires_at = Column(DateTime, nullable=False)
    consumed_at = Column(DateTime)
    created_at = Column(DateTime, nullable=False, default=func.now())


class FathomImport(Base):
    """A Fathom recording picked for import into a project (Story 13.4).

    Created when the user picks a recording; the ``fathom_import`` worker job downloads the
    recording into storage and creates the Source **with this row's id** (so the storage key
    is known before the Source exists). ``(project_id, recording_id)`` is unique: the same
    recording cannot be imported twice into a project. Deleting the Source deletes this row
    (the recording can then be imported again). Status is derived: ``source_id`` set → imported,
    otherwise the job's status (queued / running / failed).
    """

    __tablename__ = "fathom_imports"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    project_id = Column(GUID(), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    recording_id = Column(String(128), nullable=False)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"))  # importer (whose Fathom account)
    source_id = Column(GUID(), ForeignKey("sources.id", ondelete="CASCADE"), unique=True)
    job_id = Column(GUID(), ForeignKey("jobs.id", ondelete="SET NULL"))
    download_id = Column(String(128))  # Fathom download being prepared; reused across retries
    # Story 12.4: owner organization / visibility given to the Source the job creates (the importer's
    # organization on the project; 'internal' unless the importer chose 'shared'). Default owner on
    # flush: the project's owning organization.
    owner_organization_id = Column(GUID(), ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False)
    visibility = Column(String(20), nullable=False, default="internal", server_default="internal")
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    project = relationship("Project")
    source = relationship("Source")
    job = relationship("Job")

    __table_args__ = (
        UniqueConstraint("project_id", "recording_id", name="uq_fathom_imports_project_recording"),
        Index("idx_fathom_imports_recording", "recording_id"),
        CheckConstraint("visibility IN ('internal', 'shared')", name="ck_fathom_import_visibility"),
    )


class FathomWebhookEvent(Base):
    """A Fathom webhook delivery already accepted (Story 13.9) — dedupes by ``webhook-id`` per connection
    (Fathom retries failed deliveries with the same id). Old rows are pruned on insert."""

    __tablename__ = "fathom_webhook_events"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    connection_id = Column(GUID(), ForeignKey("fathom_connections.id", ondelete="CASCADE"), nullable=False)
    webhook_id = Column(String(128), nullable=False)
    received_at = Column(DateTime, nullable=False, default=func.now())

    __table_args__ = (UniqueConstraint("connection_id", "webhook_id", name="uq_fathom_webhook_event"),)


class FathomUnassignedMeeting(Base):
    """A recording pushed by the Fathom webhook with no project to land in (Story 13.9): the user
    assigns it to a project (an import is then created) or discards it. Unique per (user, recording)."""

    __tablename__ = "fathom_unassigned_meetings"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    recording_id = Column(String(128), nullable=False)
    title = Column(String(255))
    started_at = Column(DateTime)
    reason = Column(String(40), nullable=False)  # no_default_project | project_unavailable
    created_at = Column(DateTime, nullable=False, default=func.now())

    __table_args__ = (UniqueConstraint("user_id", "recording_id", name="uq_fathom_unassigned_user_recording"),)


class ProjectParticipant(Base):
    """Project participant model (V2) — distinct from ProjectMember (auth users)."""

    __tablename__ = "project_participants"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    project_id = Column(GUID(), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    email = Column(String(255))
    discipline = Column(String(100))
    role = Column(String(100))
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    # Relationships
    project = relationship("Project", back_populates="participants")

    __table_args__ = (
        Index("idx_participants_project", "project_id"),
    )


class ProjectItem(Base):
    """Project item model (V2) — formerly Decision. Supports decision, topic, idea, action_item, information."""

    __tablename__ = "project_items"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    project_id = Column(GUID(), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    transcript_id = Column(GUID(), ForeignKey("transcripts.id", ondelete="CASCADE"))  # Legacy FK preserved
    source_id = Column(GUID(), ForeignKey("sources.id"))  # V2: link to Source
    # Story 12.4: owner of a source-less item (manual input) — internal to that organization.
    # Items with a source follow the source's owner/visibility; this column is not used for them.
    owner_organization_id = Column(GUID(), ForeignKey("organizations.id", ondelete="RESTRICT"))
    # Story 13.7: extraction run that produced the item; NULL = not produced by a versioned
    # extraction (manual items, email/document items) and always shown
    extraction_run_id = Column(GUID(), ForeignKey("extraction_runs.id", ondelete="CASCADE"))

    # Story 12.6: review by role. Extracted items start 'pending' (set by the extraction code);
    # existing / manual items are 'approved'. ``original`` keeps the AI's values the first time a
    # reviewer edits the item ({title, statement, why, owner, due_date}); NULL = never edited.
    review_status = Column(String(20), nullable=False, default="approved", server_default="approved")
    reviewed_by = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"))
    reviewed_at = Column(DateTime)
    original = Column(JSONType)

    # V2 taxonomy fields
    item_type = Column(String(50), nullable=False, default="decision")
    source_type = Column(String(50), nullable=False, default="meeting")
    is_milestone = Column(Boolean, nullable=False, default=False)
    is_done = Column(Boolean, nullable=False, default=False)
    affected_disciplines = Column(JSONType, nullable=False, default=list)
    owner = Column(String(255))  # Nullable — primarily for action_items
    due_date = Column(DateTime, nullable=True)  # Story 9.6: action item due date
    source_excerpt = Column(Text)

    # Core item data
    statement = Column(Text, nullable=False)  # V2 primary field
    title = Column(String(255))  # Story 7.12: short headline; statement holds the full description
    decision_statement = Column(Text)  # V1 backward compat (auto-synced from statement)
    who = Column(String(255), nullable=False)
    timestamp = Column(String(20))  # Meeting timestamp — nullable for non-meeting sources
    discipline = Column(String(100), nullable=False)  # V1 preserved for backward compat

    # Context & reasoning
    why = Column(Text, nullable=False)
    causation = Column(Text)

    # Impacts & consensus
    impacts = Column(JSONType)
    consensus = Column(JSONType, nullable=False)

    # Agent enrichment
    confidence = Column(Float)
    similar_decisions = Column(JSONType)
    consistency_notes = Column(Text)
    anomaly_flags = Column(JSONType)

    # Vector embedding
    embedding = Column(VECTOR(384))

    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    # Relationships
    project = relationship("Project", back_populates="items")
    source = relationship("Source", back_populates="items")
    reviewer = relationship("User", foreign_keys=[reviewed_by])

    __table_args__ = (
        CheckConstraint("confidence BETWEEN 0 AND 1", name="ck_project_items_confidence_range"),
        CheckConstraint("review_status IN ('pending', 'approved', 'rejected')", name="ck_project_items_review_status"),
        CheckConstraint(
            "item_type IN ('idea', 'topic', 'decision', 'action_item', 'information')",
            name="ck_item_type",
        ),
        CheckConstraint(
            "source_type IN ('meeting', 'email', 'document', 'manual_input')",
            name="ck_source_type",
        ),
        Index("idx_project_items_project", "project_id"),
        Index("idx_project_items_discipline", "discipline"),
        Index("idx_project_items_confidence", "confidence"),
        Index("idx_project_items_created", "created_at"),
        Index("idx_project_items_composite", "project_id", "discipline", "created_at"),
        Index("idx_project_items_type", "item_type"),
        Index("idx_project_items_source_type", "source_type"),
        Index("idx_project_items_source", "source_id"),
        Index("idx_project_items_owner_org", "owner_organization_id"),
        Index("idx_project_items_run", "extraction_run_id"),
    )


class ExtractionRun(Base):
    """One extraction of a meeting source (Story 13.7).

    Every extraction (worker job, re-extract, import script) is kept as a version of the
    source; its items carry ``extraction_run_id``. Exactly one run per source is active
    (partial unique index) and only the active run's items are listed. Switching the active
    run is a rollback; edits/reviews live on the run's items and are not carried over.
    """

    __tablename__ = "extraction_runs"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    source_id = Column(GUID(), ForeignKey("sources.id", ondelete="CASCADE"), nullable=False)
    version = Column(Integer, nullable=False)  # 1, 2, ... per source
    created_at = Column(DateTime, nullable=False, default=func.now())
    created_by = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"))
    model = Column(String(100))
    prompt_version = Column(String(64))  # hash of the prompt file used
    status = Column(String(20), nullable=False, default="completed", server_default="completed")
    input_tokens = Column(Integer)
    output_tokens = Column(Integer)
    meeting_summary = Column(Text)  # restored to Source.ai_summary when the run is activated
    raw_output = Column(JSONType)  # validated items as extracted: {"items": [...]}
    is_active = Column(Boolean, nullable=False, default=False, server_default=text("false"))

    source = relationship("Source")

    __table_args__ = (
        UniqueConstraint("source_id", "version", name="uq_extraction_runs_source_version"),
        Index(
            "uq_extraction_runs_one_active", "source_id", unique=True,
            postgresql_where=text("is_active"), sqlite_where=text("is_active"),
        ),
    )


class SharedLink(Base):
    """Shared link model for public read-only access to project resources (Story 8.4)."""

    __tablename__ = "shared_links"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    project_id = Column(GUID(), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    share_token = Column(String(64), unique=True, nullable=False)
    resource_type = Column(String(50), nullable=False, default='milestone_timeline')
    created_by = Column(GUID(), ForeignKey("users.id"))
    created_at = Column(DateTime, default=func.now())
    expires_at = Column(DateTime, nullable=False)
    revoked_at = Column(DateTime)
    view_count = Column(Integer, default=0)

    __table_args__ = (
        Index("idx_shared_links_token", "share_token"),
        Index("idx_shared_links_project", "project_id"),
    )


# Backward compatibility alias — existing code can still import Decision
Decision = ProjectItem


class DecisionRelationship(Base):
    """Decision relationship model for tracking relationships between decisions/project items."""

    __tablename__ = "decision_relationships"

    from_decision_id = Column(GUID(), ForeignKey("project_items.id", ondelete="CASCADE"), primary_key=True)
    to_decision_id = Column(GUID(), ForeignKey("project_items.id", ondelete="CASCADE"), primary_key=True)
    relationship_type = Column(String(50), primary_key=True)
    created_at = Column(DateTime, nullable=False, default=func.now())

    __table_args__ = (
        Index("idx_relationships_from", "from_decision_id"),
        Index("idx_relationships_to", "to_decision_id"),
    )


@event.listens_for(Session, "before_flush")
def _default_owner_organization(session, flush_context, instances):
    """Story 12.4: new sources, Fathom imports and source-less items without an owner belong to the project's
    owning organization — platform ingestion (Gmail, Drive, seed) creates them this way. Routes acting
    for a user of a shared organization set the owner explicitly."""
    new = list(session.new)
    pending_projects = {str(o.id): o for o in new if isinstance(o, Project) and o.id is not None}
    with session.no_autoflush:
        for obj in new:
            if isinstance(obj, (Source, FathomImport)):
                needs_owner = obj.owner_organization_id is None
            elif isinstance(obj, ProjectItem):
                needs_owner = obj.owner_organization_id is None and obj.source_id is None and obj.source is None
            else:
                continue
            if not needs_owner:
                continue
            project = obj.project
            if project is None and obj.project_id is not None:
                project = pending_projects.get(str(obj.project_id)) or session.get(Project, obj.project_id)
            if project is not None:
                obj.owner_organization_id = project.owner_organization_id
