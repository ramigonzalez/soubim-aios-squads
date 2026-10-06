"""Story 12.2: every project is owned by an organization.

Revision ID: 008_story_12_2
Revises: 007_story_13_2
Create Date: 2026-10-06

Changes:
- projects.owner_organization_id becomes NOT NULL (authorization is organization-scoped;
  a project without an owner would be invisible to everyone).
- Projects still without an owner (created between 006 and 008) go to souBIM, same rule as
  the 006 backfill. If souBIM does not exist and such projects remain, the upgrade fails
  on the NOT NULL change instead of guessing an owner.

Downgrade makes the column nullable again (no data change).
"""
import sqlalchemy as sa

from alembic import op

# revision identifiers
revision = '008_story_12_2'
down_revision = '007_story_13_2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(sa.text(
        "UPDATE projects SET owner_organization_id = (SELECT id FROM organizations WHERE slug = 'soubim') "
        "WHERE owner_organization_id IS NULL AND EXISTS (SELECT 1 FROM organizations WHERE slug = 'soubim')"
    ))
    op.alter_column('projects', 'owner_organization_id', nullable=False)


def downgrade() -> None:
    op.alter_column('projects', 'owner_organization_id', nullable=True)
