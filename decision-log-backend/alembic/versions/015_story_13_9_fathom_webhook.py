"""Story 13.9: Fathom webhook (auto-import).

Revision ID: 015_story_13_9
Revises: 013_story_12_4
Create Date: 2026-10-06

Changes:
- fathom_connections: auto_import_enabled (off by default), auto_import_project_id, auto_import_visibility,
  webhook_id, webhook_secret_enc (Fernet-encrypted signing secret)
- fathom_webhook_events: accepted deliveries, unique (connection, webhook-id) — replay/idempotency
- fathom_unassigned_meetings: pushed recordings waiting for a project, unique (user, recording)
"""
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers
revision = '015_story_13_9'
down_revision = '013_story_12_4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('fathom_connections', sa.Column('auto_import_enabled', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('fathom_connections', sa.Column('auto_import_project_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('fathom_connections', sa.Column('auto_import_visibility', sa.String(20), nullable=False, server_default='internal'))
    op.add_column('fathom_connections', sa.Column('webhook_id', sa.String(128), nullable=True))
    op.add_column('fathom_connections', sa.Column('webhook_secret_enc', sa.Text(), nullable=True))
    op.create_foreign_key(
        'fk_fathom_connections_auto_import_project', 'fathom_connections', 'projects',
        ['auto_import_project_id'], ['id'], ondelete='SET NULL',
    )
    op.create_table(
        'fathom_webhook_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('connection_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('webhook_id', sa.String(128), nullable=False),
        sa.Column('received_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['connection_id'], ['fathom_connections.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('connection_id', 'webhook_id', name='uq_fathom_webhook_event'),
    )
    op.create_table(
        'fathom_unassigned_meetings',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('recording_id', sa.String(128), nullable=False),
        sa.Column('title', sa.String(255), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('reason', sa.String(40), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('user_id', 'recording_id', name='uq_fathom_unassigned_user_recording'),
    )


def downgrade() -> None:
    op.drop_table('fathom_unassigned_meetings')
    op.drop_table('fathom_webhook_events')
    op.drop_constraint('fk_fathom_connections_auto_import_project', 'fathom_connections', type_='foreignkey')
    for col in ('webhook_secret_enc', 'webhook_id', 'auto_import_visibility', 'auto_import_project_id', 'auto_import_enabled'):
        op.drop_column('fathom_connections', col)
