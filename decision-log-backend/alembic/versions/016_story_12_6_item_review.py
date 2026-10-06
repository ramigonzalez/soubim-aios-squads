"""Story 12.6: item review by role.

Revision ID: 016_story_12_6
Revises: 015_story_13_9
Create Date: 2026-10-06

Changes:
- project_items.review_status ('pending' / 'approved' / 'rejected'), reviewed_by, reviewed_at,
  original (the AI's values, kept the first time a reviewer edits the item)
- Backfill: every existing item is 'approved' (server default), so nothing changes for the
  current data (D/SEASON keeps showing its items). Only new extractions start 'pending'.
"""
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers
revision = '016_story_12_6'
down_revision = '015_story_13_9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('project_items', sa.Column('review_status', sa.String(20), nullable=False, server_default='approved'))
    op.add_column('project_items', sa.Column('reviewed_by', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('project_items', sa.Column('reviewed_at', sa.DateTime(), nullable=True))
    op.add_column('project_items', sa.Column('original', sa.JSON(), nullable=True))
    op.create_foreign_key(
        'fk_project_items_reviewed_by', 'project_items', 'users', ['reviewed_by'], ['id'], ondelete='SET NULL'
    )
    op.create_check_constraint(
        'ck_project_items_review_status', 'project_items', "review_status IN ('pending', 'approved', 'rejected')"
    )
    op.create_index('idx_project_items_review_status', 'project_items', ['review_status'])


def downgrade() -> None:
    op.drop_index('idx_project_items_review_status', table_name='project_items')
    op.drop_constraint('ck_project_items_review_status', 'project_items', type_='check')
    op.drop_constraint('fk_project_items_reviewed_by', 'project_items', type_='foreignkey')
    op.drop_column('project_items', 'original')
    op.drop_column('project_items', 'reviewed_at')
    op.drop_column('project_items', 'reviewed_by')
    op.drop_column('project_items', 'review_status')
