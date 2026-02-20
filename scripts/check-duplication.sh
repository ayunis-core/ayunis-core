#!/usr/bin/env bash
# jscpd duplication check — reports only clones involving staged files.
# Usage: ./scripts/check-duplication.sh <project-dir> [staged-file ...]
#
# Runs jscpd on the full src/ so it catches duplication against the existing
# codebase, then filters the JSON report to only flag clones that touch at
# least one of the provided staged files.

set -euo pipefail

# ── Args ─────────────────────────────────────────────────────────────────────
PROJECT_DIR="$1"; shift
STAGED_FILES=("$@")

# Filter out spec/test files, migration files, and entity/record files from staged files
FILTERED_STAGED=()
for f in "${STAGED_FILES[@]}"; do
  if [[ ! "$f" =~ \.(spec|test)\.(ts|tsx)$ ]] && \
     [[ ! "$f" =~ /migrations/ ]] && \
     [[ ! "$f" =~ \.entity\.ts$ ]] && \
     [[ ! "$f" =~ \.record\.ts$ ]]; then
    FILTERED_STAGED+=("$f")
  fi
done
if [ ${#FILTERED_STAGED[@]} -eq 0 ]; then
  echo "No non-test/migration/entity/record staged files provided — skipping duplication check."
  exit 0
fi

STAGED_FILES=("${FILTERED_STAGED[@]}")

# ── Colors ───────────────────────────────────────────────────────────────────
RED="\033[31m"
GREEN="\033[32m"
YELLOW="\033[33m"
NC="\033[0m"

# ── Thresholds ───────────────────────────────────────────────────────────────
MIN_LINES=25
MIN_TOKENS=60

# ── Temp dir for JSON report ─────────────────────────────────────────────────
REPORT_DIR=$(mktemp -d)
trap 'rm -rf "$REPORT_DIR"' EXIT

# ── Run jscpd on full src/ ───────────────────────────────────────────────────
# Ignore patterns:
# - generated/** & migrations/**: auto-generated code
# - *.spec/test.*: test files
# - *.entity.ts & *.record.ts: TypeORM entities/records (constructor param forwarding is intentional)
(
  cd "$PROJECT_DIR"
  npx --yes jscpd src \
    --threshold 100 \
    --min-lines "$MIN_LINES" \
    --min-tokens "$MIN_TOKENS" \
    --format "typescript,tsx" \
    --ignore '**/generated/**' \
    --ignore '**/migrations/**' \
    --ignore '**/*.spec.ts' \
    --ignore '**/*.test.ts' \
    --ignore '**/*.test.tsx' \
    --ignore '**/*.entity.ts' \
    --ignore '**/*.record.ts' \
    --reporters json \
    --output "$REPORT_DIR" \
    --silent >/dev/null 2>&1
)

REPORT_FILE="$REPORT_DIR/jscpd-report.json"
if [ ! -f "$REPORT_FILE" ]; then
  echo -e "${YELLOW}No jscpd report generated — skipping.${NC}"
  exit 0
fi

# ── Filter clones to those involving staged files ────────────────────────────
# Build a jq filter array from staged file paths (relative to project src/)
# Staged files come in as e.g. "ayunis-core-backend/src/domain/foo.ts"
# jscpd report paths are e.g. "src/domain/foo.ts"
PROJECT_BASENAME=$(basename "$PROJECT_DIR")
JQ_PATTERNS="["
FIRST=true
for f in "${STAGED_FILES[@]}"; do
  # Strip the project dir prefix: "ayunis-core-backend/src/..." -> "src/..."
  REL="${f#"$PROJECT_BASENAME"/}"
  if [ "$FIRST" = true ]; then
    FIRST=false
  else
    JQ_PATTERNS+=","
  fi
  JQ_PATTERNS+="\"$REL\""
done
JQ_PATTERNS+="]"

# Extract clones where at least one side is a staged file
MATCHES=$(jq --argjson staged "$JQ_PATTERNS" '
  [.duplicates[] | select(
    (.firstFile.name as $f | $staged | any(. == $f)) or
    (.secondFile.name as $s | $staged | any(. == $s))
  )]
' "$REPORT_FILE")

COUNT=$(echo "$MATCHES" | jq 'length')

if [ "$COUNT" -eq 0 ]; then
  echo -e "${GREEN}✅ No duplicated code blocks found in staged files${NC}"
  exit 0
fi

# ── Report failures ──────────────────────────────────────────────────────────
echo -e "${RED}❌ Found $COUNT duplicated code block(s) involving staged files:${NC}"
echo ""

echo "$MATCHES" | jq -r '.[] |
  "  Clone (\(.lines) lines):\n    " +
  .firstFile.name + ":" + (.firstFile.start | tostring) + "-" + (.firstFile.end | tostring) +
  "\n    " +
  .secondFile.name + ":" + (.secondFile.start | tostring) + "-" + (.secondFile.end | tostring) +
  "\n"
'

echo -e "${YELLOW}Thresholds: min-lines=$MIN_LINES, min-tokens=$MIN_TOKENS${NC}"
echo -e "${YELLOW}Extract shared logic into a helper function or module.${NC}"
exit 1
