"""Promem revamp Phase 2: per-user project visits ("novos desde sua última visita").

Revision ID: 025_promem_visits
Revises: 024_story_12_15
Create Date: 2026-10-16

Changes:
- project_visits(user_id, project_id, last_seen_at, previous_seen_at): when each user last opened
  each project. previous_seen_at is the visit before the current session.
"""
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers
revision = '025_promem_visits'
down_revision = '024_story_12_15'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'project_visits',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('last_seen_at', sa.DateTime(), nullable=False),
        sa.Column('previous_seen_at', sa.DateTime(), nullable=True),
    )
    op.create_index('idx_project_visits_project', 'project_visits', ['project_id'])


def downgrade() -> None:
    op.drop_index('idx_project_visits_project', table_name='project_visits')
    op.drop_table('project_visits')
