"""SQLAlchemy ORM models for database tables."""

from sqlalchemy import Column, String, Text, DateTime, ForeignKey, JSON, Float, Index, CheckConstraint, func, TypeDecorator
from sqlalchemy.dialects.postgresql import UUID as PGUID, JSONB
from sqlalchemy.orm import declarative_base, relationship
import uuid
try:
    from pgvector.sqlalchemy import Vector as VECTOR
except ImportError:
    # Fallback if pgvector not installed
    VECTOR = String
from datetime import datetime

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
            # If it's a string UUID with hyphens, convert to hex
            try:
                return uuid.UUID(value).hex
            except (ValueError, AttributeError):
                # If it's already hex format, return as is
                return value
        return value

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, uuid.UUID):
            return value
        if isinstance(value, str):
            # Handle both hex format (32 chars) and standard format (36 chars with hyphens)
            if len(value) == 32:
                # Add hyphens to make it standard UUID format
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
    created_at = Column(DateTime, nullable=False, default=func.now())
    archived_at = Column(DateTime)

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
    """Transcript model for meeting recordings."""

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


class Decision(Base):
    """Decision model for extracted decisions."""

    __tablename__ = "decisions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    project_id = Column(GUID(), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    transcript_id = Column(GUID(), ForeignKey("transcripts.id", ondelete="CASCADE"))

    # Core decision data
    decision_statement = Column(Text, nullable=False)
    who = Column(String(255), nullable=False)
    timestamp = Column(String(20), nullable=False)
    discipline = Column(String(100), nullable=False)

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

    __table_args__ = (
        CheckConstraint("confidence BETWEEN 0 AND 1", name="ck_confidence_range"),
        Index("idx_decisions_project", "project_id"),
        Index("idx_decisions_discipline", "discipline"),
        Index("idx_decisions_confidence", "confidence"),
        Index("idx_decisions_created", "created_at"),
        Index("idx_decisions_composite", "project_id", "discipline", "created_at"),
    )


class DecisionRelationship(Base):
    """Decision relationship model for tracking relationships between decisions."""

    __tablename__ = "decision_relationships"

    from_decision_id = Column(GUID(), ForeignKey("decisions.id", ondelete="CASCADE"), primary_key=True)
    to_decision_id = Column(GUID(), ForeignKey("decisions.id", ondelete="CASCADE"), primary_key=True)
    relationship_type = Column(String(50), primary_key=True)
    created_at = Column(DateTime, nullable=False, default=func.now())

    __table_args__ = (
        Index("idx_relationships_from", "from_decision_id"),
        Index("idx_relationships_to", "to_decision_id"),
    )
