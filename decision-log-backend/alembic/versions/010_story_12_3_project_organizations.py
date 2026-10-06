"""Story 12.3: project sharing between organizations.

Revision ID: 010_story_12_3
Revises: 009_story_13_3
Create Date: 2026-10-06

Changes:
- project_organizations (project_id, organization_id) PK, access owner/contributor/viewer,
  invited_by (users, SET NULL), created_at; at most one ``owner`` row per project
- Data backfill: every project gets an ``owner`` row for its owning organization
  (``projects.owner_organization_id`` stays the source of truth for ownership)
"""
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers
revision = '010_story_12_3'
down_revision = '009_story_13_3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'project_organizations',
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('access', sa.String(20), nullable=False),
        sa.Column('invited_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('project_id', 'organization_id'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['invited_by'], ['users.id'], ondelete='SET NULL'),
        sa.CheckConstraint("access IN ('owner', 'contributor', 'viewer')", name='ck_project_organization_access'),
    )
    op.create_index('idx_project_organizations_org', 'project_organizations', ['organization_id'])
    op.create_index(
        'uq_project_organizations_one_owner', 'project_organizations', ['project_id'],
        unique=True, postgresql_where=sa.text("access = 'owner'"),
    )

    op.execute(
        """
        INSERT INTO project_organizations (project_id, organization_id, access, created_at)
        SELECT p.id, p.owner_organization_id, 'owner', now()
        FROM projects p
        WHERE p.owner_organization_id IS NOT NULL
        ON CONFLICT DO NOTHING
        """
    )


def downgrade() -> None:
    op.drop_index('uq_project_organizations_one_owner', table_name='project_organizations')
    op.drop_index('idx_project_organizations_org', table_name='project_organizations')
    op.drop_table('project_organizations')
