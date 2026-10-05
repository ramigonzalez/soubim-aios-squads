"""Story 12.1: organizations and memberships.

Revision ID: 006_story_12_1
Revises: 005_story_7_13
Create Date: 2026-10-05

Changes:
- organizations (id, name, slug unique, created_at)
- organization_members (user_id, organization_id) PK, role owner/admin/member
- projects.owner_organization_id (FK, nullable until Story 12.2 makes every path set it)
- Data backfill: create "souBIM"; every user becomes a member (director -> admin,
  others -> member); every project is owned by souBIM
"""
import uuid

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers
revision = '006_story_12_1'
down_revision = '005_story_7_13'
branch_labels = None
depends_on = None

DEFAULT_ORG_NAME = "souBIM"
DEFAULT_ORG_SLUG = "soubim"


def _backfill(conn) -> None:
    """Default organization, memberships for every user, owner for every project. Idempotent."""
    org_id = conn.execute(sa.text("SELECT id FROM organizations WHERE slug = :slug"), {"slug": DEFAULT_ORG_SLUG}).scalar()
    if org_id is None:
        org_id = uuid.uuid4()
        conn.execute(
            sa.text("INSERT INTO organizations (id, name, slug, created_at) VALUES (:id, :name, :slug, now())"),
            {"id": org_id, "name": DEFAULT_ORG_NAME, "slug": DEFAULT_ORG_SLUG},
        )
    conn.execute(
        sa.text(
            """
            INSERT INTO organization_members (user_id, organization_id, role, created_at)
            SELECT u.id, :org_id, CASE WHEN u.role = 'director' THEN 'admin' ELSE 'member' END, now()
            FROM users u
            WHERE u.deleted_at IS NULL
              AND NOT EXISTS (SELECT 1 FROM organization_members m WHERE m.user_id = u.id)
            """
        ),
        {"org_id": org_id},
    )
    conn.execute(
        sa.text("UPDATE projects SET owner_organization_id = :org_id WHERE owner_organization_id IS NULL"),
        {"org_id": org_id},
    )


def upgrade() -> None:
    op.create_table(
        'organizations',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('slug', sa.String(100), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug', name='uq_organizations_slug'),
    )
    op.create_table(
        'organization_members',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('role', sa.String(20), nullable=False, server_default='member'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('user_id', 'organization_id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.CheckConstraint("role IN ('owner', 'admin', 'member')", name='ck_organization_member_role'),
    )
    op.create_index('idx_organization_members_org', 'organization_members', ['organization_id'])
    op.add_column('projects', sa.Column('owner_organization_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        'fk_projects_owner_organization', 'projects', 'organizations',
        ['owner_organization_id'], ['id'], ondelete='RESTRICT',
    )
    op.create_index('idx_projects_owner_org', 'projects', ['owner_organization_id'])

    _backfill(op.get_bind())


def downgrade() -> None:
    op.drop_index('idx_projects_owner_org', table_name='projects')
    op.drop_constraint('fk_projects_owner_organization', 'projects', type_='foreignkey')
    op.drop_column('projects', 'owner_organization_id')
    op.drop_index('idx_organization_members_org', table_name='organization_members')
    op.drop_table('organization_members')
    op.drop_table('organizations')
