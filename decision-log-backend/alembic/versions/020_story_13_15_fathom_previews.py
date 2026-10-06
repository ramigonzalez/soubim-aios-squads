"""Story 13.15: on-demand previews of Fathom meetings that are not imported yet.

Revision ID: 020_story_13_15
Revises: 019_story_13_12
Create Date: 2026-10-06

Changes:
- fathom_previews: one row per (user, Fathom recording) with the preview job status and the stored JPEG key.

Downgrade drops the table (the JPEG objects stay in storage under previews/).
"""
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers
revision = '020_story_13_15'
down_revision = '019_story_13_12'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'fathom_previews',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('recording_id', sa.String(128), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='queued'),
        sa.Column('thumbnail_key', sa.String(500)),
        sa.Column('download_id', sa.String(128)),
        sa.Column('job_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('jobs.id', ondelete='SET NULL')),
        sa.Column('error', sa.Text()),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('user_id', 'recording_id', name='uq_fathom_previews_user_recording'),
        sa.CheckConstraint("status IN ('queued', 'processing', 'ready', 'failed')", name='ck_fathom_preview_status'),
    )


def downgrade() -> None:
    op.drop_table('fathom_previews')
