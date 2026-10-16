"""Promem revamp Phase 3d: candidate items previewed before approval.

Revision ID: 028_promem_candidates
Revises: 027_promem_speakers
Create Date: 2026-10-16

Changes:
- sources.candidates: [{type, title, discipline}] previewed by a small model when the source arrives
  ("O que deve entrar no projeto"). The full extraction still runs after approval.
- sources.candidates_at: when the preview was made (NULL = not yet).
"""
import sqlalchemy as sa

from alembic import op

# revision identifiers
revision = '028_promem_candidates'
down_revision = '027_promem_speakers'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('sources', sa.Column('candidates', sa.JSON(), nullable=True))
    op.add_column('sources', sa.Column('candidates_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('sources', 'candidates_at')
    op.drop_column('sources', 'candidates')
