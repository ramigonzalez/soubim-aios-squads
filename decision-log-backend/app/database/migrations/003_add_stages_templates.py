"""Migration 003: Add project_stages and stage_templates tables.

Story 6.1: Backend — Project CRUD, Stage Schedule & Participants.

Changes:
- Create project_stages table (stage schedule per project)
- Create stage_templates table (predefined stage schedule templates)
- Add actual_stage_id FK on projects table → project_stages
- Seed 2 architecture stage templates
"""

# ──────────────────────────────────────────────────────────────────────────────
# NOTE: This migration is conceptual. Tables are auto-created by SQLAlchemy's
# Base.metadata.create_all() in init_db.py. The SQL below documents the intended
# schema for reference and manual execution on PostgreSQL if needed.
# ──────────────────────────────────────────────────────────────────────────────

UPGRADE_SQL = """
BEGIN;

-- 1. Create project_stages table
CREATE TABLE IF NOT EXISTS project_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    stage_name VARCHAR(255) NOT NULL,
    stage_from DATE NOT NULL,
    stage_to DATE NOT NULL,
    sort_order INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT ck_stage_dates CHECK (stage_from < stage_to)
);

CREATE INDEX IF NOT EXISTS idx_stages_project ON project_stages(project_id);
CREATE INDEX IF NOT EXISTS idx_stages_sort ON project_stages(project_id, sort_order);

-- 2. Create stage_templates table
CREATE TABLE IF NOT EXISTS stage_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_type VARCHAR(100) NOT NULL,
    template_name VARCHAR(255) NOT NULL,
    stages JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- 3. Add actual_stage_id FK to projects (if not exists)
-- Note: Column already exists from models.py but needs FK constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_projects_actual_stage'
    ) THEN
        ALTER TABLE projects
            ADD CONSTRAINT fk_projects_actual_stage
            FOREIGN KEY (actual_stage_id) REFERENCES project_stages(id)
            ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Seed stage templates
INSERT INTO stage_templates (id, project_type, template_name, stages) VALUES
(gen_random_uuid(), 'architecture_full', 'Architecture Full Project', '[
    {"stage_name":"Briefing","default_duration_days":30},
    {"stage_name":"Levantamento","default_duration_days":45},
    {"stage_name":"Estudo Preliminar","default_duration_days":60},
    {"stage_name":"Anteprojeto","default_duration_days":60},
    {"stage_name":"Projeto Legal","default_duration_days":30},
    {"stage_name":"Projeto Executivo","default_duration_days":90},
    {"stage_name":"Acompanhamento de Obra","default_duration_days":180}
]'),
(gen_random_uuid(), 'architecture_legal', 'Architecture Legal Project', '[
    {"stage_name":"Briefing","default_duration_days":15},
    {"stage_name":"Estudo Preliminar","default_duration_days":30},
    {"stage_name":"Projeto Legal","default_duration_days":45},
    {"stage_name":"Projeto Executivo","default_duration_days":60}
]');

COMMIT;
"""

DOWNGRADE_SQL = """
BEGIN;
ALTER TABLE projects DROP CONSTRAINT IF EXISTS fk_projects_actual_stage;
DROP TABLE IF EXISTS stage_templates;
DROP TABLE IF EXISTS project_stages;
COMMIT;
"""
