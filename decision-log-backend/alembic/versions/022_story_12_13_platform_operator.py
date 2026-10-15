"""Story 12.13 (Part A): platform operator flag and organization status.

Revision ID: 022_story_12_13
Revises: 021_story_13_16
Create Date: 2026-10-14

Changes:
- users.is_platform_operator: boolean NOT NULL default false. Set only by
  ``scripts/create_platform_operator.py`` (never by the API). Replaces the "owner/admin of the
  ``soubim`` organization" rule for platform-wide operations.
- organizations.status: text NOT NULL default 'active', CHECK in (active, payment_pending, blocked).
  Existing organizations become ``active``.
- users.has_password: boolean NOT NULL default true. False for accounts created with an unusable random
  password (Google sign-in, ``--no-password``), which cannot use "change password". Existing rows become
  true: accounts created by Google before this migration cannot be told apart (their random password is
  unknown to everyone, so "change password" answers ``invalid_current_password`` for them).
"""
import sqlalchemy as sa

from alembic import op

# revision identifiers
revision = '022_story_12_13'
down_revision = '021_story_13_16'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('is_platform_operator', sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        'organizations',
        sa.Column('status', sa.String(20), nullable=False, server_default='active'),
    )
    op.create_check_constraint(
        'ck_organization_status', 'organizations', "status IN ('active', 'payment_pending', 'blocked')"
    )
    op.add_column('users', sa.Column('has_password', sa.Boolean(), nullable=False, server_default=sa.true()))


def downgrade() -> None:
    op.drop_column('users', 'has_password')
    op.drop_constraint('ck_organization_status', 'organizations', type_='check')
    op.drop_column('organizations', 'status')
    op.drop_column('users', 'is_platform_operator')
