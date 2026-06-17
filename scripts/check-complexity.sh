#!/usr/bin/env bash
# Lizard complexity check for TypeScript files
# Usage: ./scripts/check-complexity.sh [file1 file2 ...]
# If no files provided, checks all staged .ts/.tsx files

set -e

if [ "${SKIP_COMPLEXITY:-0}" = "1" ]; then
    echo "SKIP_COMPLEXITY is set – skipping complexity check."
    exit 0
fi

# Thresholds (from Tweag/Modus experiment)
CCN_THRESHOLD=10      # Cyclomatic complexity
LENGTH_THRESHOLD=50   # Function length in lines
ARGS_THRESHOLD=5      # Number of arguments

# Colors
RED="\033[31m"
GREEN="\033[32m"
YELLOW="\033[33m"
NC="\033[0m"

# Check if lizard is installed. Try the available Python installer; many
# machines (e.g. fresh macOS) ship pip3/pipx but not a bare `pip`.
if ! command -v lizard &> /dev/null; then
    echo -e "${YELLOW}lizard not found; attempting install…${NC}"
    if command -v pipx &> /dev/null; then
        pipx install lizard
    elif command -v pip3 &> /dev/null; then
        pip3 install lizard --quiet
    elif command -v pip &> /dev/null; then
        pip install lizard --quiet
    else
        echo -e "${RED}Could not install lizard: no pipx/pip3/pip found.${NC}"
        echo -e "${YELLOW}Install it manually (e.g. 'pipx install lizard' or 'brew install pipx && pipx install lizard'), then re-commit.${NC}"
        echo -e "${YELLOW}To bypass this check for now: SKIP_COMPLEXITY=1 git commit …${NC}"
        exit 1
    fi
fi

# Get files to check
if [ $# -gt 0 ]; then
    FILES=$(printf "%s\n" "$@" | grep -v '/generated/' | grep -v '\.entity\.ts$' | grep -v '\.spec\.ts$' | grep -v '/db/migrations/' || true)
else
    # Default: staged TypeScript files (excluding generated code, tests, migrations, templates, data carriers)
    FILES=$(git diff --name-only --cached --diff-filter=ACMR | grep -E '\.(ts|tsx)$' \
      | grep -v '/generated/' | grep -v '\.entity\.ts$' | grep -v '\.spec\.ts$' \
      | grep -v '/db/migrations/' | grep -v '/email-templates/' \
      | grep -v '\.command\.ts$' | grep -v '\.query\.ts$' | grep -v '\.db-query\.ts$' \
      | grep -v 'unicode-sanitizer\.ts$' || true)
fi

if [ -z "$FILES" ]; then
    echo -e "${GREEN}No TypeScript files to check.${NC}"
    exit 0
fi

echo -e "Checking complexity for:"
echo "$FILES" | sed 's/^/  - /'

# Run lizard with warnings only (exit code 1 if thresholds exceeded)
RESULT=$(echo "$FILES" | tr '\n' ' ' | xargs lizard \
    --CCN $CCN_THRESHOLD \
    --length $LENGTH_THRESHOLD \
    --arguments $ARGS_THRESHOLD \
    --warnings_only \
    2>&1) || true

if [ -n "$RESULT" ]; then
    echo -e "${RED}❌ Complexity thresholds exceeded:${NC}"
    echo "$RESULT"
    echo ""
    echo -e "${YELLOW}Thresholds: CCN≤$CCN_THRESHOLD, length≤$LENGTH_THRESHOLD lines, args≤$ARGS_THRESHOLD${NC}"
    echo -e "${YELLOW}Consider refactoring these functions into smaller units.${NC}"
    exit 1
else
    echo -e "${GREEN}✅ All functions within complexity thresholds${NC}"
    exit 0
fi
