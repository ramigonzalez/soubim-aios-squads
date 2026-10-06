"""Story 13.12: meeting thumbnails.

Revision ID: 019_story_13_12
Revises: 018_story_12_8
Create Date: 2026-10-06

Changes:
- sources.thumbnail_key: storage key of the thumbnail generated from the stored recording (nullable).

Downgrade drops the column (the image objects stay in storage; scripts/generate_thumbnails.py makes them again).
"""
import sqlalchemy as sa

from alembic import op

# revision identifiers
revision = '019_story_13_12'
down_revision = '018_story_12_8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('sources', sa.Column('thumbnail_key', sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column('sources', 'thumbnail_key')
