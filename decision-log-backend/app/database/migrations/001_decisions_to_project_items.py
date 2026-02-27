"""
Migration 001: Rename decisions → project_items, add V2 columns and indexes.

Story 5.1 — Database Migration: Decision to Project Item
This migration handles:
  - Phase 1: Rename table decisions → project_items
  - Phase 2: Rename all existing indexes
  - Phase 3: Add new columns with defaults
  - Phase 4: Set NOT NULL after populating defaults
  - Phase 5: Add CHECK constraints
  - Phase 6: Add new indexes on project_items
  - Phase 7: Data transformation (discipline mapping, affected_disciplines, consensus JSON, statement alias)

PostgreSQL-only migration. Local dev uses ORM models via Base.metadata.create_all().
For production: run with psql or alembic.

Down migration is a development-only safety net. Production rollback uses pre-migration backup.
"""

# ──────────────────────────────────────────────────────────────────────
# UPGRADE SQL
# ──────────────────────────────────────────────────────────────────────

UPGRADE_SQL = """
-- ═══════════════════════════════════════════════════════════════════
-- Migration 001: decisions → project_items (Story 5.1)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ── Phase 1: Rename table ──────────────────────────────────────────
ALTER TABLE decisions RENAME TO project_items;

-- ── Phase 2: Rename existing indexes ───────────────────────────────
ALTER INDEX idx_decisions_project RENAME TO idx_project_items_project;
ALTER INDEX idx_decisions_discipline RENAME TO idx_project_items_discipline;
ALTER INDEX idx_decisions_confidence RENAME TO idx_project_items_confidence;
ALTER INDEX idx_decisions_created RENAME TO idx_project_items_created;
ALTER INDEX idx_decisions_composite RENAME TO idx_project_items_composite;
ALTER TABLE project_items RENAME CONSTRAINT ck_confidence_range TO ck_project_items_confidence_range;

-- ── Phase 3: Add new columns with defaults ─────────────────────────
ALTER TABLE project_items ADD COLUMN item_type VARCHAR(50) DEFAULT 'decision';
ALTER TABLE project_items ADD COLUMN source_type VARCHAR(50) DEFAULT 'meeting';
ALTER TABLE project_items ADD COLUMN is_milestone BOOLEAN DEFAULT false;
ALTER TABLE project_items ADD COLUMN is_done BOOLEAN DEFAULT false;
ALTER TABLE project_items ADD COLUMN affected_disciplines JSONB DEFAULT '[]';
ALTER TABLE project_items ADD COLUMN owner VARCHAR(255);
ALTER TABLE project_items ADD COLUMN source_id UUID;
ALTER TABLE project_items ADD COLUMN source_excerpt TEXT;
ALTER TABLE project_items ADD COLUMN statement TEXT;

-- ── Phase 4: Populate defaults and set NOT NULL ────────────────────
UPDATE project_items SET item_type = 'decision' WHERE item_type IS NULL;
UPDATE project_items SET source_type = 'meeting' WHERE source_type IS NULL;
UPDATE project_items SET is_milestone = false WHERE is_milestone IS NULL;
UPDATE project_items SET is_done = false WHERE is_done IS NULL;

ALTER TABLE project_items ALTER COLUMN item_type SET NOT NULL;
ALTER TABLE project_items ALTER COLUMN source_type SET NOT NULL;
ALTER TABLE project_items ALTER COLUMN is_milestone SET NOT NULL;
ALTER TABLE project_items ALTER COLUMN is_done SET NOT NULL;
ALTER TABLE project_items ALTER COLUMN affected_disciplines SET NOT NULL;

-- ── Phase 5: Add CHECK constraints ─────────────────────────────────
ALTER TABLE project_items ADD CONSTRAINT ck_item_type
    CHECK (item_type IN ('idea', 'topic', 'decision', 'action_item', 'information'));

ALTER TABLE project_items ADD CONSTRAINT ck_source_type
    CHECK (source_type IN ('meeting', 'email', 'document', 'manual_input'));

-- ── Phase 6: Add new indexes ───────────────────────────────────────
CREATE INDEX idx_project_items_type ON project_items(item_type);
CREATE INDEX idx_project_items_source_type ON project_items(source_type);
CREATE INDEX idx_project_items_milestone ON project_items(is_milestone) WHERE is_milestone = true;
CREATE INDEX idx_project_items_source ON project_items(source_id);
CREATE INDEX idx_project_items_disciplines ON project_items USING GIN (affected_disciplines);
CREATE INDEX idx_project_items_project_type_date ON project_items(project_id, item_type, created_at DESC);

-- ── Phase 7: Data transformation ───────────────────────────────────

-- 7a: Map 'interior' → 'architecture' (per architect review B1)
UPDATE project_items SET discipline = 'architecture' WHERE discipline = 'interior';

-- 7b: Populate affected_disciplines from single discipline field
UPDATE project_items
SET affected_disciplines = jsonb_build_array(discipline)
WHERE discipline IS NOT NULL;

-- 7c: Copy decision_statement to statement alias
UPDATE project_items SET statement = decision_statement;

-- 7d: Transform consensus JSON from V1 flat map to V2 structured format
-- V1 format: {"architecture":"AGREE","mep":"AGREE"}
-- V2 format: {"architecture":{"status":"AGREE","notes":null},...}
-- Note: consensus column is json (not jsonb), so explicit casts are required
UPDATE project_items
SET consensus = (
    SELECT jsonb_object_agg(
        key,
        jsonb_build_object('status', value::text, 'notes', null)
    )
    FROM jsonb_each_text(consensus::jsonb)
)::json
WHERE consensus IS NOT NULL
  AND consensus::text NOT IN ('null', '')
  AND jsonb_typeof(consensus::jsonb) = 'object';

COMMIT;
"""

# ──────────────────────────────────────────────────────────────────────
# DOWNGRADE SQL (development-only safety net)
# ──────────────────────────────────────────────────────────────────────

DOWNGRADE_SQL = """
-- ═══════════════════════════════════════════════════════════════════
-- DOWNGRADE Migration 001 (DEV ONLY — production uses backup restore)
-- Only safe when no V2-specific data exists (no items with
-- item_type != 'decision' or source_type != 'meeting')
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- Drop CHECK constraints
ALTER TABLE project_items DROP CONSTRAINT IF EXISTS ck_source_type;
ALTER TABLE project_items DROP CONSTRAINT IF EXISTS ck_item_type;

-- Drop new indexes
DROP INDEX IF EXISTS idx_project_items_project_type_date;
DROP INDEX IF EXISTS idx_project_items_disciplines;
DROP INDEX IF EXISTS idx_project_items_milestone;
DROP INDEX IF EXISTS idx_project_items_source_type;
DROP INDEX IF EXISTS idx_project_items_type;
DROP INDEX IF EXISTS idx_project_items_source;

-- Drop new columns
ALTER TABLE project_items DROP COLUMN IF EXISTS source_excerpt;
ALTER TABLE project_items DROP COLUMN IF EXISTS source_id;
ALTER TABLE project_items DROP COLUMN IF EXISTS owner;
ALTER TABLE project_items DROP COLUMN IF EXISTS affected_disciplines;
ALTER TABLE project_items DROP COLUMN IF EXISTS is_done;
ALTER TABLE project_items DROP COLUMN IF EXISTS is_milestone;
ALTER TABLE project_items DROP COLUMN IF EXISTS source_type;
ALTER TABLE project_items DROP COLUMN IF EXISTS item_type;
ALTER TABLE project_items DROP COLUMN IF EXISTS statement;

-- Rename indexes back
ALTER INDEX idx_project_items_project RENAME TO idx_decisions_project;
ALTER INDEX idx_project_items_discipline RENAME TO idx_decisions_discipline;
ALTER INDEX idx_project_items_confidence RENAME TO idx_decisions_confidence;
ALTER INDEX idx_project_items_created RENAME TO idx_decisions_created;
ALTER INDEX idx_project_items_composite RENAME TO idx_decisions_composite;
ALTER TABLE project_items RENAME CONSTRAINT ck_project_items_confidence_range TO ck_confidence_range;

-- Rename table back
ALTER TABLE project_items RENAME TO decisions;

COMMIT;
"""


def upgrade(connection):
    """Run upgrade migration against a database connection."""
    connection.execute(UPGRADE_SQL)


def downgrade(connection):
    """Run downgrade migration (development-only)."""
    connection.execute(DOWNGRADE_SQL)
