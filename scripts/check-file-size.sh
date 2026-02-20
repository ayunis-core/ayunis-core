#!/usr/bin/env bash
# File size check — flags files exceeding a line count threshold.
# Usage: ./scripts/check-file-size.sh [file1 file2 ...]
# If no files provided, checks all staged .ts/.tsx files.
#
# Override threshold via FILE_SIZE_THRESHOLD env var (default: 500).

set -euo pipefail

# ── Thresholds ───────────────────────────────────────────────────────────────
THRESHOLD="${FILE_SIZE_THRESHOLD:-500}"

# ── Colors ───────────────────────────────────────────────────────────────────
RED="\033[31m"
GREEN="\033[32m"
YELLOW="\033[33m"
NC="\033[0m"

# ── Get files to check ──────────────────────────────────────────────────────
if [ $# -gt 0 ]; then
    FILES=$(printf "%s\n" "$@")
else
    # Default: staged TypeScript files
    FILES=$(git diff --name-only --cached --diff-filter=ACMR | grep -E '\.(ts|tsx)$' || true)
fi

# ── Exclude patterns ────────────────────────────────────────────────────────
FILES=$(echo "$FILES" | grep -v '/generated/' \
    | grep -v '/migrations/' \
    | grep -v '/shadcn/' \
    | grep -v '\.spec\.ts$' \
    | grep -v '\.spec\.tsx$' \
    | grep -v '\.test\.ts$' \
    | grep -v '\.test\.tsx$' \
    | grep -v '\.record\.ts$' \
    | grep -v '\-data\.ts$' \
    || true)

if [ -z "$FILES" ]; then
    echo -e "${GREEN}No files to check.${NC}"
    exit 0
fi

# ── Check each file ─────────────────────────────────────────────────────────
VIOLATIONS=0

while IFS= read -r file; do
    [ -z "$file" ] && continue
    [ ! -f "$file" ] && continue

    LINES=$(wc -l < "$file" | tr -d ' ')

    if [ "$LINES" -gt "$THRESHOLD" ]; then
        if [ "$VIOLATIONS" -eq 0 ]; then
            echo -e "${RED}❌ Files exceeding $THRESHOLD-line threshold:${NC}"
            echo ""
        fi
        echo -e "  ${YELLOW}${file}${NC}: ${RED}${LINES}${NC} lines (limit: ${THRESHOLD})"
        VIOLATIONS=$((VIOLATIONS + 1))
    fi
done <<< "$FILES"

if [ "$VIOLATIONS" -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}$VIOLATIONS file(s) exceed the $THRESHOLD-line limit.${NC}"
    echo -e "${YELLOW}Consider splitting into smaller modules.${NC}"
    exit 1
else
    echo -e "${GREEN}✅ All files within $THRESHOLD-line limit${NC}"
    exit 0
fi
