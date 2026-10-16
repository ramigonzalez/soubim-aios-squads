"""Promem revamp Phase 3f: firm branding for public links, links that never expire.

Revision ID: 030_promem_branding
Revises: 029_promem_templates
Create Date: 2026-10-16

Changes:
- organizations.tagline, contact_email, logo_data (a small image as a data URL) (G7)
- shared_links.expires_at nullable: NULL = the link never expires ("Nunca") (G8)
"""
import sqlalchemy as sa

from alembic import op

# revision identifiers
revision = '030_promem_branding'
down_revision = '029_promem_templates'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('organizations', sa.Column('tagline', sa.String(255), nullable=True))
    op.add_column('organizations', sa.Column('contact_email', sa.String(255), nullable=True))
    op.add_column('organizations', sa.Column('logo_data', sa.Text(), nullable=True))
    op.alter_column('shared_links', 'expires_at', existing_type=sa.DateTime(), nullable=True)


def downgrade() -> None:
    op.execute("UPDATE shared_links SET expires_at = now() + interval '3650 days' WHERE expires_at IS NULL")
    op.alter_column('shared_links', 'expires_at', existing_type=sa.DateTime(), nullable=False)
    op.drop_column('organizations', 'logo_data')
    op.drop_column('organizations', 'contact_email')
    op.drop_column('organizations', 'tagline')
