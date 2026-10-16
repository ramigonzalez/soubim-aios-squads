"""Promem revamp Phase 3c: speaker corrections for uncertain transcript turns.

Revision ID: 027_promem_speakers
Revises: 026_promem_occurred_at
Create Date: 2026-10-16

Changes:
- transcript_speaker_corrections(source_id, turn_start, speaker, corrected_by, corrected_at): the person
  picked for a turn marked "⚠️" by the transcription. The original transcript is never rewritten.
"""
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers
revision = '027_promem_speakers'
down_revision = '026_promem_occurred_at'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'transcript_speaker_corrections',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), primary_key=True),
        sa.Column('source_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('sources.id', ondelete='CASCADE'), nullable=False),
        sa.Column('turn_start', sa.Integer(), nullable=False),
        sa.Column('speaker', sa.String(255), nullable=False),
        sa.Column('corrected_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL')),
        sa.Column('corrected_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('source_id', 'turn_start', name='uq_speaker_correction_turn'),
    )
    op.create_index('idx_speaker_corrections_source', 'transcript_speaker_corrections', ['source_id'])


def downgrade() -> None:
    op.drop_index('idx_speaker_corrections_source', table_name='transcript_speaker_corrections')
    op.drop_table('transcript_speaker_corrections')
