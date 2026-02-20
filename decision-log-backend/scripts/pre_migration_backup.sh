#!/bin/bash
# Pre-Migration Backup Script — Story 5.1
# Creates a PostgreSQL backup before running V2 migrations.
#
# Usage:
#   ./scripts/pre_migration_backup.sh
#
# Requires:
#   - DATABASE_URL environment variable set
#   - pg_dump available in PATH

set -euo pipefail

BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/pre_v2_migration_${TIMESTAMP}.dump"

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

# Validate DATABASE_URL
if [ -z "${DATABASE_URL:-}" ]; then
    echo "ERROR: DATABASE_URL environment variable not set."
    echo "Set it in .env or export it before running this script."
    exit 1
fi

echo "Creating pre-migration backup..."
echo "  Target: ${BACKUP_FILE}"

pg_dump "${DATABASE_URL}" -Fc --no-acl --no-owner -f "${BACKUP_FILE}"

BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "Backup created successfully."
echo "  File: ${BACKUP_FILE}"
echo "  Size: ${BACKUP_SIZE}"
echo ""
echo "To restore: pg_restore --no-owner --no-acl -d \$DATABASE_URL ${BACKUP_FILE}"
echo ""
echo "Verify before proceeding with migration."
