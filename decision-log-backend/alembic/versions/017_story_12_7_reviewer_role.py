"""Story 12.7: ``reviewer`` organization role.

Revision ID: 017_story_12_7
Revises: 016_story_12_6
Create Date: 2026-10-06

Changes:
- organization_members.role and organization_invitations.role accept 'reviewer'
  (CHECK constraints ck_organization_member_role / ck_organization_invitation_role).
- No data change on upgrade.

Downgrade: reviewers become members (the closest role without review rights: they keep their
project assignments and lose review), then the old constraints are restored.
"""
from alembic import op

# revision identifiers
revision = '017_story_12_7'
down_revision = '016_story_12_6'
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
    _set_roles("'owner', 'admin', 'reviewer', 'member'")


def downgrade() -> None:
    for table, _ in _TABLES:
        op.execute(f"UPDATE {table} SET role = 'member' WHERE role = 'reviewer'")
    _set_roles("'owner', 'admin', 'member'")
