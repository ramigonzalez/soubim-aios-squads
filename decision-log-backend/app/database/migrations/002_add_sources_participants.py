"""
Migration 002: Create sources and project_participants tables, link transcripts to sources.

Story 5.1 — Database Migration: Decision to Project Item
This migration handles:
  - Create sources table (meeting, email, document, manual_input)
  - Create project_participants table
  - All indexes (including partial unique indexes)
  - Source-type-specific CHECK constraints
  - Transcript → Source data migration
  - Link project_items.source_id to new source records

Depends on: Migration 001 (project_items table must exist)
PostgreSQL-only. Local dev uses ORM models via Base.metadata.create_all().

Down migration drops tables (safe because tables are new in V2).
"""

# ──────────────────────────────────────────────────────────────────────
# UPGRADE SQL
# ──────────────────────────────────────────────────────────────────────

UPGRADE_SQL = """
-- ═══════════════════════════════════════════════════════════════════
-- Migration 002: sources + project_participants + transcript linking
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ── Create sources table ───────────────────────────────────────────
CREATE TABLE sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL,
    title VARCHAR(500),
    occurred_at TIMESTAMP NOT NULL,
    ingestion_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    ai_summary TEXT,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    raw_content TEXT,
    -- Meeting-specific
    meeting_type VARCHAR(50),
    participants JSONB,
    duration_minutes INTEGER,
    webhook_id VARCHAR(255),
    -- Email-specific
    email_from VARCHAR(500),
    email_to JSONB,
    email_cc JSONB,
    email_thread_id VARCHAR(255),
    -- Document-specific (Phase 2)
    file_url VARCHAR(1000),
    file_type VARCHAR(50),
    file_size INTEGER,
    drive_folder_id VARCHAR(255),
    -- Metadata
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT ck_source_type_valid
        CHECK (source_type IN ('meeting', 'email', 'document', 'manual_input')),
    CONSTRAINT ck_ingestion_status_valid
        CHECK (ingestion_status IN ('pending', 'approved', 'rejected', 'processed'))
);

-- Source indexes
CREATE INDEX idx_sources_project ON sources(project_id);
CREATE INDEX idx_sources_status ON sources(ingestion_status);
CREATE INDEX idx_sources_type ON sources(source_type);
CREATE INDEX idx_sources_occurred ON sources(occurred_at DESC);
CREATE UNIQUE INDEX idx_sources_webhook ON sources(webhook_id) WHERE webhook_id IS NOT NULL;
CREATE INDEX idx_sources_email_thread ON sources(email_thread_id) WHERE email_thread_id IS NOT NULL;

-- Source-type-specific constraint: meeting must have meeting_type
ALTER TABLE sources ADD CONSTRAINT ck_source_meeting
    CHECK (source_type != 'meeting' OR meeting_type IS NOT NULL);

-- ── Create project_participants table ──────────────────────────────
CREATE TABLE project_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    discipline VARCHAR(100),
    role VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Participant indexes (partial unique per architect review A5)
CREATE INDEX idx_participants_project ON project_participants(project_id);
CREATE UNIQUE INDEX idx_participants_email
    ON project_participants(project_id, email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX idx_participants_name
    ON project_participants(project_id, name) WHERE email IS NULL;

-- ── Add FK from project_items to sources ───────────────────────────
ALTER TABLE project_items
    ADD CONSTRAINT fk_project_items_source
    FOREIGN KEY (source_id) REFERENCES sources(id);

-- ── Transcript → Source data migration ─────────────────────────────
-- Create Source records from existing transcripts
INSERT INTO sources (
    id, project_id, source_type, title, occurred_at,
    ingestion_status, raw_content, meeting_type,
    participants, duration_minutes, webhook_id,
    created_at, updated_at
)
SELECT
    gen_random_uuid(),
    t.project_id,
    'meeting',
    COALESCE(t.meeting_title, 'Meeting ' || t.meeting_date::date),
    t.meeting_date,
    'processed',
    t.transcript_text,
    t.meeting_type,
    t.participants::jsonb,
    CAST(t.duration_minutes AS INTEGER),
    t.webhook_id,
    t.created_at,
    t.created_at
FROM transcripts t;

-- Link project_items to sources via transcript → source mapping
UPDATE project_items pi
SET source_id = s.id
FROM sources s
JOIN transcripts t ON s.webhook_id = t.webhook_id
WHERE pi.transcript_id = t.id;

COMMIT;
"""

# ──────────────────────────────────────────────────────────────────────
# DOWNGRADE SQL
# ──────────────────────────────────────────────────────────────────────

DOWNGRADE_SQL = """
-- ═══════════════════════════════════════════════════════════════════
-- DOWNGRADE Migration 002 (drops new tables — safe, they're V2-only)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- Remove FK from project_items
ALTER TABLE project_items DROP CONSTRAINT IF EXISTS fk_project_items_source;

-- Clear source_id references
UPDATE project_items SET source_id = NULL;

-- Drop tables (CASCADE to drop indexes and constraints)
DROP TABLE IF EXISTS project_participants CASCADE;
DROP TABLE IF EXISTS sources CASCADE;

COMMIT;
"""


def upgrade(connection):
    """Run upgrade migration against a database connection."""
    connection.execute(UPGRADE_SQL)


def downgrade(connection):
    """Run downgrade migration."""
    connection.execute(DOWNGRADE_SQL)
