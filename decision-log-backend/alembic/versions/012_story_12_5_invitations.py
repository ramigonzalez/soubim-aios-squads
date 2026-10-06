"""Story 12.5: organization invitations.

Revision ID: 012_story_12_5
Revises: 011_story_13_4
Create Date: 2026-10-06

Changes:
- organization_invitations: organization (or organization_name for a company without an
  organization yet), email, role, token_hash (SHA-256, unique), invited_by, expires_at,
  accepted_at, revoked_at
"""
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers
revision = '012_story_12_5'
down_revision = '011_story_13_4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'organization_invitations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('organization_name', sa.String(255), nullable=True),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('role', sa.String(20), nullable=False, server_default='member'),
        sa.Column('token_hash', sa.String(64), nullable=False),
        sa.Column('invited_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('accepted_at', sa.DateTime(), nullable=True),
        sa.Column('revoked_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['invited_by'], ['users.id'], ondelete='SET NULL'),
        sa.UniqueConstraint('token_hash'),
        sa.CheckConstraint("role IN ('owner', 'admin', 'member')", name='ck_organization_invitation_role'),
        sa.CheckConstraint(
            'organization_id IS NOT NULL OR organization_name IS NOT NULL', name='ck_organization_invitation_target'
        ),
    )
    op.create_index('idx_organization_invitations_org', 'organization_invitations', ['organization_id'])
    op.create_index('idx_organization_invitations_email', 'organization_invitations', ['email'])


def downgrade() -> None:
    op.drop_index('idx_organization_invitations_email', table_name='organization_invitations')
    op.drop_index('idx_organization_invitations_org', table_name='organization_invitations')
    op.drop_table('organization_invitations')
