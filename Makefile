# DecisionLog — Development Commands
# Usage: make <target>

# ─── Configuration ───────────────────────────────────────────────────────
BACKEND_DIR := decision-log-backend
ALEMBIC := cd $(BACKEND_DIR) && export DATABASE_URL=$$(grep '^DATABASE_URL=' .env | cut -d= -f2-) && venv/bin/alembic

# ─── Database Migrations (Alembic) ──────────────────────────────────────

## Create a new migration (auto-detect changes from models.py)
## Usage: make db-migrate MSG="add users table"
db-migrate:
	$(ALEMBIC) revision --autogenerate -m "$(MSG)"

## Create an empty migration for manual SQL
## Usage: make db-migration-empty MSG="backfill statement column"
db-migration-empty:
	$(ALEMBIC) revision -m "$(MSG)"

## Run all pending migrations
db-upgrade:
	$(ALEMBIC) upgrade head

## Upgrade to a specific revision
## Usage: make db-upgrade-to REV=002_v2_schema
db-upgrade-to:
	$(ALEMBIC) upgrade $(REV)

## Downgrade by one migration
db-downgrade:
	$(ALEMBIC) downgrade -1

## Downgrade to a specific revision
## Usage: make db-downgrade-to REV=001_initial
db-downgrade-to:
	$(ALEMBIC) downgrade $(REV)

## Downgrade all migrations (back to empty DB)
db-downgrade-base:
	$(ALEMBIC) downgrade base

## Show current migration revision
db-current:
	$(ALEMBIC) current

## Show migration history
db-history:
	$(ALEMBIC) history --verbose

## Stamp DB at a revision without running migrations
## Usage: make db-stamp REV=002_v2_schema
db-stamp:
	$(ALEMBIC) stamp $(REV)

## Show pending migrations (heads vs current)
db-heads:
	$(ALEMBIC) heads

# ─── Help ────────────────────────────────────────────────────────────────

help:
	@echo "DecisionLog Development Commands"
	@echo ""
	@echo "Database Migrations:"
	@echo "  make db-migrate MSG=\"...\"      Create auto-detected migration"
	@echo "  make db-migration-empty MSG=\"...\" Create empty migration"
	@echo "  make db-upgrade               Run all pending migrations"
	@echo "  make db-upgrade-to REV=...    Upgrade to specific revision"
	@echo "  make db-downgrade             Downgrade by one step"
	@echo "  make db-downgrade-to REV=...  Downgrade to specific revision"
	@echo "  make db-downgrade-base        Downgrade to empty DB"
	@echo "  make db-current               Show current revision"
	@echo "  make db-history               Show migration history"
	@echo "  make db-stamp REV=...         Stamp DB at revision (no run)"
	@echo "  make db-heads                 Show head revisions"

.PHONY: db-migrate db-migration-empty db-upgrade db-upgrade-to db-downgrade db-downgrade-to db-downgrade-base db-current db-history db-stamp db-heads help
