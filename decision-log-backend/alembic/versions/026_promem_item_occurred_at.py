"""Promem revamp Phase 3b: when a manual item happened.

Revision ID: 026_promem_occurred_at
Revises: 025_promem_visits
Create Date: 2026-10-16

Changes:
- project_items.occurred_at: the date a manual item happened (a site visit, a call). NULL for items
  extracted from a source, which take the source's date.
"""
import sqlalchemy as sa

from alembic import op

# revision identifiers
revision = '026_promem_occurred_at'
down_revision = '025_promem_visits'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('project_items', sa.Column('occurred_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('project_items', 'occurred_at')
