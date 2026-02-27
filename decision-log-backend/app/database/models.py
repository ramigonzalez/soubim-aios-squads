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
    func,
)
from sqlalchemy.dialects.postgresql import UUID as PGUID
from sqlalchemy.orm import declarative_base, relationship

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


class Project(Base):
    """Project model for architectural projects."""

    __tablename__ = "projects"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    project_type = Column(String(100))  # V2: residential, commercial, mixed-use, etc.
    actual_stage_id = Column(GUID(), ForeignKey("project_stages.id", ondelete="SET NULL", use_alter=True))
    created_at = Column(DateTime, nullable=False, default=func.now())
    archived_at = Column(DateTime)

    # Relationships
    items = relationship("ProjectItem", back_populates="project", cascade="all, delete-orphan")
    sources = relationship("Source", back_populates="project", cascade="all, delete-orphan")
    participants = relationship("ProjectParticipant", back_populates="project", cascade="all, delete-orphan")
    stages = relationship("ProjectStage", back_populates="project", cascade="all, delete-orphan", foreign_keys="ProjectStage.project_id")

    __table_args__ = (
        Index("idx_projects_created", "created_at"),
        Index("idx_projects_archived", "archived_at"),
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
    source_type = Column(String(50), nullable=False)
    title = Column(String(500))
    occurred_at = Column(DateTime, nullable=False)
    ingestion_status = Column(String(50), nullable=False, default="pending")
    ai_summary = Column(Text)
    approved_by = Column(GUID(), ForeignKey("users.id"))
    approved_at = Column(DateTime)
    raw_content = Column(Text)

    # Meeting-specific
    meeting_type = Column(String(50))
    participants = Column(JSONType)
    duration_minutes = Column(Integer)
    webhook_id = Column(String(255))

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
            "ingestion_status IN ('pending', 'approved', 'rejected', 'processed')",
            name="ck_ingestion_status_valid",
        ),
        Index("idx_sources_project", "project_id"),
        Index("idx_sources_status", "ingestion_status"),
        Index("idx_sources_type", "source_type"),
        Index("idx_sources_occurred", "occurred_at"),
    )


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


class ProjectStage(Base):
    """Project stage model — stages in a project's schedule."""

    __tablename__ = "project_stages"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    project_id = Column(GUID(), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    stage_name = Column(String(255), nullable=False)
    stage_from = Column(DateTime, nullable=False)
    stage_to = Column(DateTime, nullable=False)
    sort_order = Column(Integer, nullable=False)
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    # Relationships
    project = relationship("Project", back_populates="stages", foreign_keys=[project_id])

    __table_args__ = (
        CheckConstraint("stage_from < stage_to", name="ck_stage_dates"),
        Index("idx_stages_project", "project_id"),
        Index("idx_stages_sort", "project_id", "sort_order"),
    )


class StageTemplate(Base):
    """Predefined stage schedule template for project types."""

    __tablename__ = "stage_templates"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    project_type = Column(String(100), nullable=False)
    template_name = Column(String(255), nullable=False)
    stages = Column(JSONType, nullable=False)
    created_at = Column(DateTime, nullable=False, default=func.now())


class ProjectItem(Base):
    """Project item model (V2) — formerly Decision. Supports decision, topic, idea, action_item, information."""

    __tablename__ = "project_items"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    project_id = Column(GUID(), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    transcript_id = Column(GUID(), ForeignKey("transcripts.id", ondelete="CASCADE"))  # Legacy FK preserved
    source_id = Column(GUID(), ForeignKey("sources.id"))  # V2: link to Source

    # V2 taxonomy fields
    item_type = Column(String(50), nullable=False, default="decision")
    source_type = Column(String(50), nullable=False, default="meeting")
    is_milestone = Column(Boolean, nullable=False, default=False)
    is_done = Column(Boolean, nullable=False, default=False)
    affected_disciplines = Column(JSONType, nullable=False, default=list)
    owner = Column(String(255))  # Nullable — primarily for action_items
    source_excerpt = Column(Text)

    # Core item data (V1 fields preserved)
    statement = Column(Text)  # V2 alias for decision_statement
    decision_statement = Column(Text, nullable=False)  # V1 preserved for backward compat
    who = Column(String(255), nullable=False)
    timestamp = Column(String(20), nullable=False)
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

    __table_args__ = (
        CheckConstraint("confidence BETWEEN 0 AND 1", name="ck_project_items_confidence_range"),
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
