"""Promem revamp Phase 4e: Notificações (computed on read, read state stored).

Revision ID: 031_promem_notifications
Revises: 030_promem_branding
Create Date: 2026-10-16

Changes:
- project_items.milestone_at / milestone_by: when and by whom an item became a marco
- users.notifications_seen_at: "Marcar todas como lidas" (everything up to then is read)
- notification_reads: single notifications read after that
"""
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers
revision = '031_promem_notifications'
down_revision = '030_promem_branding'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('project_items', sa.Column('milestone_at', sa.DateTime(), nullable=True))
    op.add_column(
        'project_items',
        sa.Column('milestone_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
    )
    op.add_column('users', sa.Column('notifications_seen_at', sa.DateTime(), nullable=True))
    op.create_table(
        'notification_reads',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('key', sa.String(120), primary_key=True),
        sa.Column('read_at', sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('notification_reads')
    op.drop_column('users', 'notifications_seen_at')
    op.drop_column('project_items', 'milestone_by')
    op.drop_column('project_items', 'milestone_at')
