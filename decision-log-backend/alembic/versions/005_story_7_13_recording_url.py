"""Story 7.13: external recording link for sources.

Revision ID: 005_story_7_13
Revises: 004_story_7_12
Create Date: 2026-10-04

Changes:
- Add nullable recording_url (varchar 1000) to sources (e.g. Fathom share URL).
  Stored recordings live in uploads/recordings/<source_id>.<ext> and need no column.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '005_story_7_13'
down_revision = '004_story_7_12'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('sources', sa.Column('recording_url', sa.String(length=1000), nullable=True))


def downgrade() -> None:
    op.drop_column('sources', 'recording_url')
