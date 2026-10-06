"""Story 13.4: Fathom imports.

Revision ID: 010_story_13_4
Revises: 009_story_13_3
Create Date: 2026-10-06

Changes:
- fathom_imports: a Fathom recording picked for import into a project; unique per
  (project, recording) so the same recording is never imported twice into a project
"""
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers
revision = '010_story_13_4'
down_revision = '009_story_13_3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'fathom_imports',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('recording_id', sa.String(128), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('source_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('job_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('download_id', sa.String(128), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['source_id'], ['sources.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ondelete='SET NULL'),
        sa.UniqueConstraint('project_id', 'recording_id', name='uq_fathom_imports_project_recording'),
        sa.UniqueConstraint('source_id', name='uq_fathom_imports_source'),
    )
    op.create_index('idx_fathom_imports_recording', 'fathom_imports', ['recording_id'])


def downgrade() -> None:
    op.drop_index('idx_fathom_imports_recording', table_name='fathom_imports')
    op.drop_table('fathom_imports')
