"""Initial database schema with 7 tables and pgvector.

Revision ID: 001_initial
Revises:
Create Date: 2026-02-07 23:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from pgvector.sqlalchemy import Vector

# revision identifiers
revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Apply initial schema migration."""

    # Enable pgvector extension
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    op.execute('CREATE EXTENSION IF NOT EXISTS "vector"')

    # Create users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('role', sa.String(50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('last_login_at', sa.DateTime(timezone=True)),
        sa.Column('deleted_at', sa.DateTime(timezone=True)),
        sa.CheckConstraint("role IN ('director', 'architect', 'client')", name='ck_user_role'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
    )
    op.create_index('idx_users_email', 'users', ['email'], unique=False)
    op.create_index('idx_users_role', 'users', ['role'], unique=False)
    op.create_index('idx_users_deleted', 'users', ['deleted_at'], unique=False, postgresql_where=sa.text('deleted_at IS NULL'))

    # Create projects table
    op.create_table(
        'projects',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('archived_at', sa.DateTime(timezone=True)),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_projects_created', 'projects', [sa.desc('created_at')], unique=False)
    op.create_index('idx_projects_archived', 'projects', ['archived_at'], unique=False, postgresql_where=sa.text('archived_at IS NULL'))

    # Create project_members table
    op.create_table(
        'project_members',
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('role', sa.String(50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('project_id', 'user_id'),
    )
    op.create_index('idx_project_members_user', 'project_members', ['user_id'], unique=False)

    # Create transcripts table
    op.create_table(
        'transcripts',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('webhook_id', sa.String(255), unique=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('meeting_id', sa.String(255)),
        sa.Column('meeting_type', sa.String(50)),
        sa.Column('participants', postgresql.JSONB, nullable=False),
        sa.Column('transcript_text', sa.Text, nullable=False),
        sa.Column('duration_minutes', sa.String),
        sa.Column('meeting_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_transcripts_project', 'transcripts', ['project_id'], unique=False)
    op.create_index('idx_transcripts_date', 'transcripts', ['meeting_date'], unique=False)
    op.create_index('idx_transcripts_type', 'transcripts', ['meeting_type'], unique=False)

    # Create decisions table
    op.create_table(
        'decisions',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('transcript_id', postgresql.UUID(as_uuid=True)),
        sa.Column('decision_statement', sa.Text, nullable=False),
        sa.Column('who', sa.String(255), nullable=False),
        sa.Column('timestamp', sa.String(20), nullable=False),
        sa.Column('discipline', sa.String(100), nullable=False),
        sa.Column('why', sa.Text, nullable=False),
        sa.Column('causation', sa.Text),
        sa.Column('impacts', postgresql.JSONB),
        sa.Column('consensus', postgresql.JSONB, nullable=False),
        sa.Column('confidence', sa.Float),
        sa.Column('similar_decisions', postgresql.JSONB),
        sa.Column('consistency_notes', sa.Text),
        sa.Column('anomaly_flags', postgresql.JSONB),
        sa.Column('embedding', Vector(384)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint('confidence BETWEEN 0 AND 1', name='ck_confidence_range'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['transcript_id'], ['transcripts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_decisions_project', 'decisions', ['project_id'], unique=False)
    op.create_index('idx_decisions_discipline', 'decisions', ['discipline'], unique=False)
    op.create_index('idx_decisions_confidence', 'decisions', ['confidence'], unique=False)
    op.create_index('idx_decisions_created', 'decisions', [sa.desc('created_at')], unique=False)
    op.create_index(
        'idx_decisions_composite',
        'decisions',
        ['project_id', 'discipline', sa.desc('created_at')],
        unique=False
    )

    # Create decision_relationships table
    op.create_table(
        'decision_relationships',
        sa.Column('from_decision_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('to_decision_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('relationship_type', sa.String(50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['from_decision_id'], ['decisions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['to_decision_id'], ['decisions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('from_decision_id', 'to_decision_id', 'relationship_type'),
    )
    op.create_index('idx_relationships_from', 'decision_relationships', ['from_decision_id'], unique=False)
    op.create_index('idx_relationships_to', 'decision_relationships', ['to_decision_id'], unique=False)


def downgrade() -> None:
    """Revert initial schema migration."""

    # Drop tables in reverse order (respecting foreign keys)
    op.drop_table('decision_relationships')
    op.drop_table('decisions')
    op.drop_table('transcripts')
    op.drop_table('project_members')
    op.drop_table('projects')
    op.drop_table('users')

    # Drop extensions
    op.execute('DROP EXTENSION IF EXISTS "vector"')
    op.execute('DROP EXTENSION IF EXISTS "uuid-ossp"')
