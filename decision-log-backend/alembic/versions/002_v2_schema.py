"""V2 schema migration — Story 5.1 taxonomy refactor.

Revision ID: 002_v2_schema
Revises: 001_initial
Create Date: 2026-03-06

Changes:
- Add columns to projects (project_type, actual_stage_id, drive_folder_id, last_drive_poll)
- Add meeting_title to transcripts
- Rename decisions -> project_items with new columns/constraints/indexes
- Update decision_relationships FKs to reference project_items
- Create new tables: sources, project_participants, project_stages, stage_templates, shared_links
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '002_v2_schema'
down_revision = '001_initial'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Apply V2 schema migration."""

    # ── A. Modify existing tables ──────────────────────────────────────

    # projects: add 4 columns
    op.add_column('projects', sa.Column('project_type', sa.String(100), nullable=True))
    op.add_column('projects', sa.Column('actual_stage_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('projects', sa.Column('drive_folder_id', sa.String(255), nullable=True))
    op.add_column('projects', sa.Column('last_drive_poll', sa.DateTime(), nullable=True))

    # transcripts: add meeting_title
    op.add_column('transcripts', sa.Column('meeting_title', sa.String(255), nullable=True))

    # ── B. Rename decisions -> project_items ───────────────────────────

    op.rename_table('decisions', 'project_items')

    # Alter existing columns on project_items
    op.alter_column('project_items', 'decision_statement', existing_type=sa.Text(), nullable=True)
    op.alter_column('project_items', 'timestamp', existing_type=sa.String(20), nullable=True)

    # Add new columns to project_items
    op.add_column('project_items', sa.Column('source_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('project_items', sa.Column('item_type', sa.String(50), nullable=False, server_default='decision'))
    op.add_column('project_items', sa.Column('source_type', sa.String(50), nullable=False, server_default='meeting'))
    op.add_column('project_items', sa.Column('is_milestone', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('project_items', sa.Column('is_done', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('project_items', sa.Column('affected_disciplines', postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")))
    op.add_column('project_items', sa.Column('owner', sa.String(255), nullable=True))
    op.add_column('project_items', sa.Column('due_date', sa.DateTime(), nullable=True))
    op.add_column('project_items', sa.Column('source_excerpt', sa.Text(), nullable=True))
    op.add_column('project_items', sa.Column('statement', sa.Text(), nullable=True))

    # Backfill statement from decision_statement
    op.execute("UPDATE project_items SET statement = decision_statement WHERE statement IS NULL")

    # Now make statement NOT NULL
    op.alter_column('project_items', 'statement', existing_type=sa.Text(), nullable=False)

    # Rename constraint: ck_confidence_range -> ck_project_items_confidence_range
    op.drop_constraint('ck_confidence_range', 'project_items', type_='check')
    op.create_check_constraint(
        'ck_project_items_confidence_range',
        'project_items',
        'confidence BETWEEN 0 AND 1',
    )

    # Add new CHECK constraints
    op.create_check_constraint(
        'ck_item_type',
        'project_items',
        "item_type IN ('idea', 'topic', 'decision', 'action_item', 'information')",
    )
    op.create_check_constraint(
        'ck_source_type',
        'project_items',
        "source_type IN ('meeting', 'email', 'document', 'manual_input')",
    )

    # Rename indexes (drop old, create new)
    op.drop_index('idx_decisions_project', table_name='project_items')
    op.drop_index('idx_decisions_discipline', table_name='project_items')
    op.drop_index('idx_decisions_confidence', table_name='project_items')
    op.drop_index('idx_decisions_created', table_name='project_items')
    op.drop_index('idx_decisions_composite', table_name='project_items')

    op.create_index('idx_project_items_project', 'project_items', ['project_id'])
    op.create_index('idx_project_items_discipline', 'project_items', ['discipline'])
    op.create_index('idx_project_items_confidence', 'project_items', ['confidence'])
    op.create_index('idx_project_items_created', 'project_items', [sa.desc('created_at')])
    op.create_index('idx_project_items_composite', 'project_items', ['project_id', 'discipline', sa.desc('created_at')])

    # Add new indexes
    op.create_index('idx_project_items_type', 'project_items', ['item_type'])
    op.create_index('idx_project_items_source_type', 'project_items', ['source_type'])
    op.create_index('idx_project_items_source', 'project_items', ['source_id'])

    # ── C. Update decision_relationships FKs ───────────────────────────

    op.drop_constraint(
        'decision_relationships_from_decision_id_fkey',
        'decision_relationships',
        type_='foreignkey',
    )
    op.drop_constraint(
        'decision_relationships_to_decision_id_fkey',
        'decision_relationships',
        type_='foreignkey',
    )
    op.create_foreign_key(
        'decision_relationships_from_decision_id_fkey',
        'decision_relationships',
        'project_items',
        ['from_decision_id'],
        ['id'],
        ondelete='CASCADE',
    )
    op.create_foreign_key(
        'decision_relationships_to_decision_id_fkey',
        'decision_relationships',
        'project_items',
        ['to_decision_id'],
        ['id'],
        ondelete='CASCADE',
    )

    # ── D. Create new tables ───────────────────────────────────────────

    # sources table (V2, Story 7.7/7.8 — excluding Story 7.9 columns)
    op.create_table(
        'sources',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('source_type', sa.String(50), nullable=False),
        sa.Column('title', sa.String(500), nullable=True),
        sa.Column('occurred_at', sa.DateTime(), nullable=False),
        sa.Column('ingestion_status', sa.String(50), nullable=False, server_default='pending'),
        sa.Column('ai_summary', sa.Text(), nullable=True),
        sa.Column('approved_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
        sa.Column('raw_content', sa.Text(), nullable=True),
        # Meeting-specific
        sa.Column('meeting_type', sa.String(50), nullable=True),
        sa.Column('participants', postgresql.JSONB(), nullable=True),
        sa.Column('duration_minutes', sa.Integer(), nullable=True),
        sa.Column('webhook_id', sa.String(255), nullable=True),
        # Email-specific
        sa.Column('email_from', sa.String(500), nullable=True),
        sa.Column('email_to', postgresql.JSONB(), nullable=True),
        sa.Column('email_cc', postgresql.JSONB(), nullable=True),
        sa.Column('email_thread_id', sa.String(255), nullable=True),
        # Document-specific
        sa.Column('file_url', sa.String(1000), nullable=True),
        sa.Column('file_type', sa.String(50), nullable=True),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('drive_folder_id', sa.String(255), nullable=True),
        sa.Column('drive_file_id', sa.String(255), nullable=True),
        # Ingestion UI
        sa.Column('included', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('source_label', sa.String(100), nullable=True),
        # Curation workflow
        sa.Column('curation_status', sa.String(50), server_default='raw', nullable=True),
        sa.Column('last_synced_at', sa.DateTime(), nullable=True),
        # Timestamps
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        # Constraints
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['approved_by'], ['users.id']),
        sa.CheckConstraint(
            "source_type IN ('meeting', 'email', 'document', 'manual_input')",
            name='ck_source_type_valid',
        ),
        sa.CheckConstraint(
            "ingestion_status IN ('pending', 'approved', 'rejected', 'processed')",
            name='ck_ingestion_status_valid',
        ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('drive_file_id'),
    )
    op.create_index('idx_sources_project', 'sources', ['project_id'])
    op.create_index('idx_sources_status', 'sources', ['ingestion_status'])
    op.create_index('idx_sources_type', 'sources', ['source_type'])
    op.create_index('idx_sources_occurred', 'sources', ['occurred_at'])
    op.create_index('idx_sources_drive_file', 'sources', ['drive_file_id'])

    # project_participants table
    op.create_table(
        'project_participants',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('discipline', sa.String(100), nullable=True),
        sa.Column('role', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_participants_project', 'project_participants', ['project_id'])

    # project_stages table
    op.create_table(
        'project_stages',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('stage_name', sa.String(255), nullable=False),
        sa.Column('stage_from', sa.DateTime(), nullable=False),
        sa.Column('stage_to', sa.DateTime(), nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_project_stages_project', 'project_stages', ['project_id'])

    # stage_templates table
    op.create_table(
        'stage_templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('project_type', sa.String(100), nullable=False),
        sa.Column('template_name', sa.String(255), nullable=False),
        sa.Column('stages', postgresql.JSONB(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_stage_templates_type', 'stage_templates', ['project_type'])

    # shared_links table
    op.create_table(
        'shared_links',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('share_token', sa.String(64), nullable=False),
        sa.Column('resource_type', sa.String(50), nullable=False, server_default='milestone_timeline'),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('revoked_at', sa.DateTime(), nullable=True),
        sa.Column('view_count', sa.Integer(), server_default='0'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('share_token'),
    )
    op.create_index('idx_shared_links_token', 'shared_links', ['share_token'])
    op.create_index('idx_shared_links_project', 'shared_links', ['project_id'])

    # ── E. Add FK for project_items.source_id -> sources.id ────────────

    op.create_foreign_key(
        'fk_project_items_source_id',
        'project_items',
        'sources',
        ['source_id'],
        ['id'],
    )


def downgrade() -> None:
    """Revert V2 schema migration."""

    # ── E. Drop source_id FK ──────────────────────────────────────────
    op.drop_constraint('fk_project_items_source_id', 'project_items', type_='foreignkey')

    # ── D. Drop new tables (reverse order) ─────────────────────────────
    op.drop_table('shared_links')
    op.drop_table('stage_templates')
    op.drop_table('project_stages')
    op.drop_table('project_participants')
    op.drop_table('sources')

    # ── C. Restore decision_relationships FKs ──────────────────────────
    op.drop_constraint(
        'decision_relationships_from_decision_id_fkey',
        'decision_relationships',
        type_='foreignkey',
    )
    op.drop_constraint(
        'decision_relationships_to_decision_id_fkey',
        'decision_relationships',
        type_='foreignkey',
    )
    op.create_foreign_key(
        'decision_relationships_from_decision_id_fkey',
        'decision_relationships',
        'decisions',
        ['from_decision_id'],
        ['id'],
        ondelete='CASCADE',
    )
    op.create_foreign_key(
        'decision_relationships_to_decision_id_fkey',
        'decision_relationships',
        'decisions',
        ['to_decision_id'],
        ['id'],
        ondelete='CASCADE',
    )

    # ── B. Reverse project_items -> decisions ──────────────────────────

    # Drop new indexes
    op.drop_index('idx_project_items_source', table_name='project_items')
    op.drop_index('idx_project_items_source_type', table_name='project_items')
    op.drop_index('idx_project_items_type', table_name='project_items')

    # Drop renamed indexes, recreate originals
    op.drop_index('idx_project_items_composite', table_name='project_items')
    op.drop_index('idx_project_items_created', table_name='project_items')
    op.drop_index('idx_project_items_confidence', table_name='project_items')
    op.drop_index('idx_project_items_discipline', table_name='project_items')
    op.drop_index('idx_project_items_project', table_name='project_items')

    # Drop new CHECK constraints
    op.drop_constraint('ck_source_type', 'project_items', type_='check')
    op.drop_constraint('ck_item_type', 'project_items', type_='check')

    # Restore original confidence constraint
    op.drop_constraint('ck_project_items_confidence_range', 'project_items', type_='check')
    op.create_check_constraint(
        'ck_confidence_range',
        'project_items',
        'confidence BETWEEN 0 AND 1',
    )

    # Backfill decision_statement from statement before dropping
    op.execute("UPDATE project_items SET decision_statement = statement WHERE decision_statement IS NULL")

    # Drop new columns
    op.drop_column('project_items', 'statement')
    op.drop_column('project_items', 'source_excerpt')
    op.drop_column('project_items', 'due_date')
    op.drop_column('project_items', 'owner')
    op.drop_column('project_items', 'affected_disciplines')
    op.drop_column('project_items', 'is_done')
    op.drop_column('project_items', 'is_milestone')
    op.drop_column('project_items', 'source_type')
    op.drop_column('project_items', 'item_type')
    op.drop_column('project_items', 'source_id')

    # Restore NOT NULL on original columns
    op.alter_column('project_items', 'timestamp', existing_type=sa.String(20), nullable=False)
    op.alter_column('project_items', 'decision_statement', existing_type=sa.Text(), nullable=False)

    # Rename table back
    op.rename_table('project_items', 'decisions')

    # Recreate original indexes on decisions
    op.create_index('idx_decisions_project', 'decisions', ['project_id'])
    op.create_index('idx_decisions_discipline', 'decisions', ['discipline'])
    op.create_index('idx_decisions_confidence', 'decisions', ['confidence'])
    op.create_index('idx_decisions_created', 'decisions', [sa.desc('created_at')])
    op.create_index('idx_decisions_composite', 'decisions', ['project_id', 'discipline', sa.desc('created_at')])

    # ── A. Drop added columns from existing tables ─────────────────────
    op.drop_column('transcripts', 'meeting_title')
    op.drop_column('projects', 'last_drive_poll')
    op.drop_column('projects', 'drive_folder_id')
    op.drop_column('projects', 'actual_stage_id')
    op.drop_column('projects', 'project_type')
