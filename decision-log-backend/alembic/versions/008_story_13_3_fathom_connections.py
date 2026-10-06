"""Story 13.3: Fathom OAuth connections.

Revision ID: 008_story_13_3
Revises: 007_story_13_2
Create Date: 2026-10-06

Changes:
- fathom_connections: one connected Fathom account per user, tokens encrypted at rest
- fathom_pending_connections: callback tokens awaiting confirmation by the logged-in user
  (binds the connection to the confirming user; single-use OAuth state)
"""
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers
revision = '008_story_13_3'
down_revision = '007_story_13_2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'fathom_connections',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('access_token_enc', sa.Text(), nullable=False),
        sa.Column('refresh_token_enc', sa.Text(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('scope', sa.String(255), nullable=True),
        sa.Column('account_label', sa.String(255), nullable=True),
        sa.Column('connected_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('revoked_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='SET NULL'),
        sa.UniqueConstraint('user_id', name='uq_fathom_connections_user'),
    )
    op.create_table(
        'fathom_pending_connections',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('nonce', sa.String(64), nullable=False),
        sa.Column('state_nonce', sa.String(64), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('access_token_enc', sa.Text(), nullable=True),
        sa.Column('refresh_token_enc', sa.Text(), nullable=True),
        sa.Column('token_expires_at', sa.DateTime(), nullable=True),
        sa.Column('scope', sa.String(255), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('consumed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('nonce', name='uq_fathom_pending_connections_nonce'),
        sa.UniqueConstraint('state_nonce', name='uq_fathom_pending_connections_state_nonce'),
    )
    op.create_index('ix_fathom_pending_connections_expires_at', 'fathom_pending_connections', ['expires_at'])


def downgrade() -> None:
    op.drop_index('ix_fathom_pending_connections_expires_at', table_name='fathom_pending_connections')
    op.drop_table('fathom_pending_connections')
    op.drop_table('fathom_connections')
