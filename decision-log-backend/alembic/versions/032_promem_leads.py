"""Promem revamp Phase 5: requests from the landing page's contact form.

Revision ID: 032_promem_leads
Revises: 031_promem_notifications
Create Date: 2026-10-16

The form's final destination (e-mail / CRM / WhatsApp) is still to be defined (LANDING_COPY →
placeholder checklist); until then requests are stored here and listed to the platform operator.
"""
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers
revision = '032_promem_leads'
down_revision = '031_promem_notifications'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'leads',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('mode', sa.String(10), nullable=False),
        sa.Column('name', sa.String(120), nullable=False),
        sa.Column('company', sa.String(160), nullable=False),
        sa.Column('whatsapp', sa.String(20), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('role', sa.String(20), nullable=True),
        sa.Column('team_size', sa.String(10), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('handled_at', sa.DateTime(), nullable=True),
        sa.Column('handled_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.CheckConstraint("mode IN ('demo', 'pilot')", name='ck_leads_mode'),
    )
    op.create_index('idx_leads_created', 'leads', ['created_at'])


def downgrade() -> None:
    op.drop_index('idx_leads_created', table_name='leads')
    op.drop_table('leads')
