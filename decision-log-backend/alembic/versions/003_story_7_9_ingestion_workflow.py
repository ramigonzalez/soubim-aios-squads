"""Story 7.9: Ingestion workflow redesign — add failed status, rejected_by/at, extraction_error.

Revision ID: 003_story_7_9
Revises: 002_v2_schema
Create Date: 2026-03-05

Changes:
- Drop and recreate CHECK constraint on ingestion_status to include 'failed'
- Add rejected_by (UUID FK), rejected_at (timestamp), extraction_error (text) columns
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '003_story_7_9'
down_revision = '002_v2_schema'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add failed status and rejection tracking columns to sources."""

    # 1. Drop old CHECK constraint and add new one with 'failed'
    op.drop_constraint('ck_ingestion_status_valid', 'sources', type_='check')
    op.create_check_constraint(
        'ck_ingestion_status_valid',
        'sources',
        "ingestion_status IN ('pending', 'approved', 'rejected', 'processed', 'failed')",
    )

    # 2. Add rejection tracking columns
    op.add_column('sources', sa.Column('rejected_by', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('sources', sa.Column('rejected_at', sa.DateTime(), nullable=True))
    op.add_column('sources', sa.Column('extraction_error', sa.Text(), nullable=True))

    # 3. Add FK constraint for rejected_by → users.id
    op.create_foreign_key(
        'fk_sources_rejected_by_users',
        'sources',
        'users',
        ['rejected_by'],
        ['id'],
    )


def downgrade() -> None:
    """Reverse Story 7.9 changes."""

    # Update any 'failed' statuses back to 'approved' before constraint change
    op.execute("UPDATE sources SET ingestion_status = 'approved' WHERE ingestion_status = 'failed'")

    # Drop new columns
    op.drop_constraint('fk_sources_rejected_by_users', 'sources', type_='foreignkey')
    op.drop_column('sources', 'extraction_error')
    op.drop_column('sources', 'rejected_at')
    op.drop_column('sources', 'rejected_by')

    # Restore original CHECK constraint
    op.drop_constraint('ck_ingestion_status_valid', 'sources', type_='check')
    op.create_check_constraint(
        'ck_ingestion_status_valid',
        'sources',
        "ingestion_status IN ('pending', 'approved', 'rejected', 'processed')",
    )
