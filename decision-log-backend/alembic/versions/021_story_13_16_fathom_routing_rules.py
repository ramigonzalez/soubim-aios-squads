"""Story 13.16: Fathom routing rules per project.

Revision ID: 021_story_13_16
Revises: 020_story_13_15
Create Date: 2026-10-07

Changes:
- project_fathom_rules: rules that send a webhook meeting to a project (title contains / participant
  email equals / participant domain equals), cascade-deleted with the project.
- fathom_unassigned_meetings.matched_project_ids: ids of the projects a ``conflict`` meeting matched (json).

``fathom_connections.auto_import_project_id`` (13.9 default project) is no longer read or written; the
column is kept so this migration loses no data and a rollback restores the 13.9 behaviour.
"""
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers
revision = '021_story_13_16'
down_revision = '020_story_13_15'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'project_fathom_rules',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('field', sa.String(30), nullable=False),
        sa.Column('operator', sa.String(20), nullable=False),
        sa.Column('value', sa.String(200), nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL')),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint(
            "field IN ('title', 'participant_email', 'participant_domain')", name='ck_project_fathom_rule_field'),
        sa.CheckConstraint("operator IN ('contains', 'equals')", name='ck_project_fathom_rule_operator'),
    )
    op.create_index('ix_project_fathom_rules_project_id', 'project_fathom_rules', ['project_id'])
    op.add_column('fathom_unassigned_meetings', sa.Column('matched_project_ids', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('fathom_unassigned_meetings', 'matched_project_ids')
    op.drop_index('ix_project_fathom_rules_project_id', table_name='project_fathom_rules')
    op.drop_table('project_fathom_rules')
