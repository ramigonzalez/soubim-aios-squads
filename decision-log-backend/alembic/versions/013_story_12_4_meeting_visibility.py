"""Story 12.4: meeting visibility (internal / shared).

Revision ID: 013_story_12_4
Revises: 012_story_12_5
Create Date: 2026-10-06

Changes:
- sources.owner_organization_id (organizations, RESTRICT, NOT NULL after backfill) + index
- sources.visibility 'internal' | 'shared' (NOT NULL, default 'internal') + check constraint
- project_items.owner_organization_id (organizations, RESTRICT, nullable) + index — owner of
  source-less items (manual input); items with a source follow the source
- fathom_imports.owner_organization_id (NOT NULL after backfill) + visibility (Story 13.4 integration):
  the organization and visibility the import job gives the Source it creates
- Data backfill: every source → its project's owning organization, 'internal' (story AC);
  every source-less item → its project's owning organization; every Fathom import → its Source's
  owner (or the project's owning organization while still in flight), 'internal'
"""
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers
revision = '013_story_12_4'
down_revision = '012_story_12_5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('sources', sa.Column('owner_organization_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column(
        'sources',
        sa.Column('visibility', sa.String(20), nullable=False, server_default='internal'),
    )
    op.create_foreign_key(
        'fk_sources_owner_organization', 'sources', 'organizations',
        ['owner_organization_id'], ['id'], ondelete='RESTRICT',
    )
    op.create_check_constraint('ck_source_visibility', 'sources', "visibility IN ('internal', 'shared')")
    op.execute(
        """
        UPDATE sources s
        SET owner_organization_id = p.owner_organization_id
        FROM projects p
        WHERE s.project_id = p.id AND s.owner_organization_id IS NULL
        """
    )
    # projects.owner_organization_id is NOT NULL (008), so every source got an owner
    op.alter_column('sources', 'owner_organization_id', nullable=False)
    op.create_index('idx_sources_owner_org', 'sources', ['owner_organization_id'])

    op.add_column('project_items', sa.Column('owner_organization_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        'fk_project_items_owner_organization', 'project_items', 'organizations',
        ['owner_organization_id'], ['id'], ondelete='RESTRICT',
    )
    op.execute(
        """
        UPDATE project_items i
        SET owner_organization_id = p.owner_organization_id
        FROM projects p
        WHERE i.project_id = p.id AND i.source_id IS NULL AND i.owner_organization_id IS NULL
        """
    )
    op.create_index('idx_project_items_owner_org', 'project_items', ['owner_organization_id'])

    # Story 13.4 integration: Fathom imports carry the owner/visibility of the Source to create
    op.add_column('fathom_imports', sa.Column('owner_organization_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column(
        'fathom_imports',
        sa.Column('visibility', sa.String(20), nullable=False, server_default='internal'),
    )
    op.create_foreign_key(
        'fk_fathom_imports_owner_organization', 'fathom_imports', 'organizations',
        ['owner_organization_id'], ['id'], ondelete='RESTRICT',
    )
    op.create_check_constraint('ck_fathom_import_visibility', 'fathom_imports', "visibility IN ('internal', 'shared')")
    op.execute(
        """
        UPDATE fathom_imports f
        SET owner_organization_id = COALESCE(
            (SELECT s.owner_organization_id FROM sources s WHERE s.id = f.source_id),
            p.owner_organization_id
        )
        FROM projects p
        WHERE f.project_id = p.id AND f.owner_organization_id IS NULL
        """
    )
    op.alter_column('fathom_imports', 'owner_organization_id', nullable=False)


def downgrade() -> None:
    op.drop_constraint('ck_fathom_import_visibility', 'fathom_imports', type_='check')
    op.drop_constraint('fk_fathom_imports_owner_organization', 'fathom_imports', type_='foreignkey')
    op.drop_column('fathom_imports', 'visibility')
    op.drop_column('fathom_imports', 'owner_organization_id')

    op.drop_index('idx_project_items_owner_org', table_name='project_items')
    op.drop_constraint('fk_project_items_owner_organization', 'project_items', type_='foreignkey')
    op.drop_column('project_items', 'owner_organization_id')

    op.drop_index('idx_sources_owner_org', table_name='sources')
    op.drop_constraint('ck_source_visibility', 'sources', type_='check')
    op.drop_constraint('fk_sources_owner_organization', 'sources', type_='foreignkey')
    op.drop_column('sources', 'visibility')
    op.drop_column('sources', 'owner_organization_id')
