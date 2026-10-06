"""Story 13.7: extraction versions.

Revision ID: 014_story_13_7
Revises: 013_story_12_4
Create Date: 2026-10-06

Changes:
- extraction_runs: one row per extraction of a source (version, model, prompt hash, tokens,
  summary, raw output, is_active); one active run per source (partial unique index)
- project_items.extraction_run_id -> extraction_runs (NULL = manual item, always shown)
- Backfill: the existing items of each source become version 1, active, so nothing changes
  for the current data
"""
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers
revision = '014_story_13_7'
down_revision = '013_story_12_4'
branch_labels = None
depends_on = None


# Backfill: each source's existing items form its version 1 (active). Exposed for the tests.
BACKFILL_SQL = [
    """
    INSERT INTO extraction_runs (id, source_id, version, created_at, meeting_summary, is_active)
    SELECT gen_random_uuid(), pi.source_id, 1, MIN(pi.created_at), s.ai_summary, TRUE
    FROM project_items pi JOIN sources s ON s.id = pi.source_id
    GROUP BY pi.source_id, s.ai_summary
    """,
    """
    UPDATE project_items pi SET extraction_run_id = er.id
    FROM extraction_runs er WHERE er.source_id = pi.source_id
    """,
]


def upgrade() -> None:
    op.create_table(
        'extraction_runs',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('source_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('model', sa.String(100), nullable=True),
        sa.Column('prompt_version', sa.String(64), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='completed'),
        sa.Column('input_tokens', sa.Integer(), nullable=True),
        sa.Column('output_tokens', sa.Integer(), nullable=True),
        sa.Column('meeting_summary', sa.Text(), nullable=True),
        sa.Column('raw_output', sa.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['source_id'], ['sources.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.UniqueConstraint('source_id', 'version', name='uq_extraction_runs_source_version'),
    )
    op.create_index(
        'uq_extraction_runs_one_active', 'extraction_runs', ['source_id'],
        unique=True, postgresql_where=sa.text('is_active'),
    )
    op.add_column('project_items', sa.Column('extraction_run_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        'fk_project_items_extraction_run', 'project_items', 'extraction_runs',
        ['extraction_run_id'], ['id'], ondelete='CASCADE',
    )
    op.create_index('idx_project_items_run', 'project_items', ['extraction_run_id'])

    for statement in BACKFILL_SQL:
        op.execute(statement)


def downgrade() -> None:
    # Versions that are not active would show up again as duplicates: drop their items
    op.execute("DELETE FROM project_items WHERE extraction_run_id IN (SELECT id FROM extraction_runs WHERE NOT is_active)")
    op.drop_index('idx_project_items_run', table_name='project_items')
    op.drop_constraint('fk_project_items_extraction_run', 'project_items', type_='foreignkey')
    op.drop_column('project_items', 'extraction_run_id')
    op.drop_index('uq_extraction_runs_one_active', table_name='extraction_runs')
    op.drop_table('extraction_runs')
