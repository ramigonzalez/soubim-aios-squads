"""Promem revamp Phase 3e: the prototype's stage templates (REVAMP-MAPPING G10).

Revision ID: 029_promem_templates
Revises: 028_promem_candidates
Create Date: 2026-10-16

Changes:
- stage_templates: "Edificação padrão", "Casa" and "Retrofit" (durations from the design handoff),
  added next to the existing ones. Inserted only when missing, so re-running is harmless.
"""
import json

import sqlalchemy as sa

from alembic import op

# revision identifiers
revision = '029_promem_templates'
down_revision = '028_promem_candidates'
branch_labels = None
depends_on = None

TEMPLATES = [
    ("edificacao_padrao", "Edificação padrão", [("Estudo Preliminar", 31), ("Anteprojeto", 44), ("Projeto Legal", 45), ("Projeto Executivo", 108)]),
    ("casa", "Casa", [("Estudo Preliminar", 30), ("Anteprojeto", 45), ("Projeto Executivo", 90)]),
    ("retrofit", "Retrofit", [("Levantamento", 30), ("Diagnóstico", 30), ("Projeto Legal", 60), ("Projeto Executivo", 90)]),
]


def upgrade() -> None:
    conn = op.get_bind()
    for project_type, name, stages in TEMPLATES:
        exists = conn.execute(sa.text("SELECT 1 FROM stage_templates WHERE project_type = :t"), {"t": project_type}).first()
        if exists:
            continue
        conn.execute(
            sa.text("INSERT INTO stage_templates (id, project_type, template_name, stages) VALUES (gen_random_uuid(), :t, :n, CAST(:s AS JSON))"),
            {"t": project_type, "n": name, "s": json.dumps([{"stage_name": s, "default_duration_days": d} for s, d in stages], ensure_ascii=False)},
        )


def downgrade() -> None:
    conn = op.get_bind()
    for project_type, _name, _stages in TEMPLATES:
        conn.execute(sa.text("DELETE FROM stage_templates WHERE project_type = :t"), {"t": project_type})
