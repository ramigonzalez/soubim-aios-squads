"""Story 12.15: external people invited to one project.

Revision ID: 024_story_12_15
Revises: 023_story_12_9
Create Date: 2026-10-15

Changes:
- organization_members.role and organization_invitations.role accept 'external' (CHECK constraints
  ck_organization_member_role / ck_organization_invitation_role).
- project_members.access: 'viewer' / 'contributor' for an external person's assignment (NULL for regular
  members and reviewers, whose level comes from their organization role). CHECK ck_project_member_access.
- organization_invitations.project_id: set for a project invitation (the invitee becomes an ``external``
  member of the organization, assigned to this project only). Deleting the project deletes its invitations.
- organization_invitations.rejected_at: the invitee rejected the invitation (shown as "recusado").
- sources.created_by / project_items.created_by: who added the meeting / item (the "Externo" badge next
  to the author). NULL for existing rows and for platform ingestion (Gmail, Drive, extraction).
- No data change on upgrade.

Downgrade: external memberships, their project assignments and project invitations are deleted, then the
columns and the old constraints are restored.
"""
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers
revision = '024_story_12_15'
down_revision = '023_story_12_9'
branch_labels = None
depends_on = None

_TABLES = (
    ('organization_members', 'ck_organization_member_role'),
    ('organization_invitations', 'ck_organization_invitation_role'),
)


def _set_roles(roles: str) -> None:
    for table, constraint in _TABLES:
        op.drop_constraint(constraint, table, type_='check')
        op.create_check_constraint(constraint, table, f"role IN ({roles})")


def upgrade() -> None:
    _set_roles("'owner', 'admin', 'reviewer', 'member', 'external'")
    op.add_column('project_members', sa.Column('access', sa.String(20), nullable=True))
    op.create_check_constraint(
        'ck_project_member_access', 'project_members', "access IS NULL OR access IN ('viewer', 'contributor')"
    )
    op.add_column(
        'organization_invitations',
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=True),
    )
    op.add_column('organization_invitations', sa.Column('rejected_at', sa.DateTime(), nullable=True))
    op.create_index('idx_organization_invitations_project', 'organization_invitations', ['project_id'])
    for table in ('sources', 'project_items'):
        op.add_column(
            table,
            sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        )


def downgrade() -> None:
    for table in ('project_items', 'sources'):
        op.drop_column(table, 'created_by')
    op.execute(
        "DELETE FROM project_members pm USING organization_members om, projects p "
        "WHERE om.role = 'external' AND om.user_id = pm.user_id AND p.id = pm.project_id "
        "AND p.owner_organization_id = om.organization_id"
    )
    op.execute("DELETE FROM organization_members WHERE role = 'external'")
    op.execute("DELETE FROM organization_invitations WHERE role = 'external' OR project_id IS NOT NULL")
    op.drop_index('idx_organization_invitations_project', table_name='organization_invitations')
    op.drop_column('organization_invitations', 'rejected_at')
    op.drop_column('organization_invitations', 'project_id')
    op.drop_constraint('ck_project_member_access', 'project_members', type_='check')
    op.drop_column('project_members', 'access')
    _set_roles("'owner', 'admin', 'reviewer', 'member'")
