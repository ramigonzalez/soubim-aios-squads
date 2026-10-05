"""Story 7.12: short title for project items.

Revision ID: 004_story_7_12
Revises: 003_story_7_9
Create Date: 2026-10-04

Changes:
- Add nullable title (varchar 255) to project_items; statement keeps the full description
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '004_story_7_12'
down_revision = '003_story_7_9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('project_items', sa.Column('title', sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column('project_items', 'title')
