"""Story 13.2: background jobs table.

Revision ID: 007_story_13_2
Revises: 006_story_12_1
Create Date: 2026-10-05

Changes:
- jobs: queue for the worker process (claimed with SELECT ... FOR UPDATE SKIP LOCKED)
"""
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers
revision = '007_story_13_2'
down_revision = '006_story_12_1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'jobs',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('payload', postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('status', sa.String(20), nullable=False, server_default='queued'),
        sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('max_attempts', sa.Integer(), nullable=False, server_default='3'),
        sa.Column('run_after', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('locked_by', sa.String(100), nullable=True),
        sa.Column('locked_at', sa.DateTime(), nullable=True),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('source_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['source_id'], ['sources.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='SET NULL'),
        sa.CheckConstraint("status IN ('queued', 'running', 'succeeded', 'failed')", name='ck_job_status'),
    )
    op.create_index('idx_jobs_claim', 'jobs', ['status', 'run_after'])
    op.create_index('idx_jobs_source', 'jobs', ['source_id'])


def downgrade() -> None:
    op.drop_index('idx_jobs_source', table_name='jobs')
    op.drop_index('idx_jobs_claim', table_name='jobs')
    op.drop_table('jobs')
