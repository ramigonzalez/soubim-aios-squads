#!/usr/bin/env bash
# Promem token guard (docs/design_handoff_promem/README.md §0.4).
# Feature code may not contain raw colours (#hex, rgb/rgba) or arbitrary px
# values; those live only in src/design-system (tokens.css + the preset).
#
# Legacy files written before the revamp are listed in
# scripts/token-guard-baseline.txt and skipped. Each migrated screen removes its
# files from the baseline; new files are always checked.
set -euo pipefail
cd "$(dirname "$0")/.."

BASELINE="scripts/token-guard-baseline.txt"
PATTERN='#[0-9A-Fa-f]{6}\b|rgba?\(|\[[0-9.]+px\]'

violations=$(grep -rnE "$PATTERN" src --include='*.ts' --include='*.tsx' \
  --exclude-dir=design-system --exclude-dir=tests || true)

if [ -f "$BASELINE" ]; then
  violations=$(printf '%s\n' "$violations" | grep -v -F -f <(grep -v '^#' "$BASELINE" | grep -v '^$' | sed 's/$/:/') || true)
fi

violations=$(printf '%s\n' "$violations" | grep -v '^$' || true)
if [ -n "$violations" ]; then
  echo "Raw colours or px values outside src/design-system (use tokens / preset classes):"
  echo "$violations"
  exit 1
fi
echo "Token guard: OK"
