#!/usr/bin/env bash
#
# Spotlight Coverage Check (PostToolUse hook)
#
# Reads the edited file path from stdin (Claude Code hook protocol).
# If the edit touched a file in src/pages, src/widgets, src/features,
# or the spotlight system itself, runs a static audit that compares:
#
#   1. SPOTLIGHT_TARGET constants  (spotlight-targets.ts)
#   2. Markers referenced by steps (categories.ts)
#   3. Markers wrapped in DOM     (any <SpotlightTarget name={...}>)
#
# A mismatch between (2) and (3) means a spotlight will silently fail
# at runtime. The hook surfaces such issues to Claude via stderr +
# non-blocking JSON so Claude can react.
#
# Exits 0 in all cases — this hook never blocks edits, only informs.

set -euo pipefail

INPUT="$(cat || true)"

# Hook payload is JSON: { tool_input: { file_path: "..." }, ... }
# Use jq if available; fall back to grep so the script also runs standalone.
if command -v jq >/dev/null 2>&1 && [ -n "$INPUT" ]; then
  FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""' 2>/dev/null || echo "")
else
  FILE=$(echo "$INPUT" | grep -oE '"file_path":[[:space:]]*"[^"]+"' | head -1 | sed 's/.*"\([^"]*\)"$/\1/' || echo "")
fi

# Only run for edits to files that could affect spotlight coverage.
case "$FILE" in
  */src/pages/*.tsx|*/src/pages/**/*.tsx) ;;
  */src/widgets/*.tsx|*/src/widgets/**/*.tsx) ;;
  */src/features/*.tsx|*/src/features/**/*.tsx) ;;
  */src/shared/lib/spotlight-targets.ts) ;;
  */src/pages/getting-started/model/categories.ts) ;;
  */src/shared/ui/spotlight-overlay/*.tsx) ;;
  *) exit 0 ;;
esac

# Resolve frontend root regardless of where the hook is invoked from.
if [ -n "${CLAUDE_PROJECT_DIR:-}" ]; then
  FRONTEND="$CLAUDE_PROJECT_DIR/ayunis-core-frontend"
else
  # Fall back to walking up from the script location.
  FRONTEND="$(cd "$(dirname "$0")/.." && pwd)/ayunis-core-frontend"
fi

CONST_FILE="$FRONTEND/src/shared/lib/spotlight-targets.ts"
STEPS_FILE="$FRONTEND/src/pages/getting-started/model/categories.ts"

# Bail silently if the project layout doesn't match (skill not in use here).
[ -f "$CONST_FILE" ] || exit 0
[ -f "$STEPS_FILE" ] || exit 0

# Collect the three sets.
declare_keys() {
  grep -oE "^\s+[a-zA-Z][a-zA-Z0-9]*:" "$CONST_FILE" | tr -d ': ' | sort -u
}

referenced_keys() {
  grep -oE "SPOTLIGHT_TARGET\.[a-zA-Z][a-zA-Z0-9]*" "$STEPS_FILE" \
    | sed 's/SPOTLIGHT_TARGET\.//' | sort -u
}

wrapped_keys() {
  grep -rh "SPOTLIGHT_TARGET\.[a-zA-Z][a-zA-Z0-9]*" "$FRONTEND/src" \
    --include='*.tsx' 2>/dev/null \
    | grep -v "spotlight-targets.ts\|categories.ts" \
    | grep -oE "SPOTLIGHT_TARGET\.[a-zA-Z][a-zA-Z0-9]*" \
    | sed 's/SPOTLIGHT_TARGET\.//' \
    | sort -u
}

CONST_SET=$(declare_keys)
REF_SET=$(referenced_keys)
WRAP_SET=$(wrapped_keys)

ORPHANS=$(comm -23 <(echo "$REF_SET") <(echo "$WRAP_SET"))
UNUSED=$(comm -23 <(echo "$CONST_SET") <(echo -e "$REF_SET\n$WRAP_SET" | sort -u))

# Check sample attachment files exist.
MISSING_FILES=""
while IFS= read -r path; do
  [ -z "$path" ] && continue
  full="$FRONTEND/public$path"
  [ -f "$full" ] || MISSING_FILES="${MISSING_FILES}\n  - $path"
done < <(grep -oE "'/getting-started-samples/[^']+'" "$STEPS_FILE" | tr -d "'" | sort -u)

# If nothing's wrong, stay silent.
if [ -z "$ORPHANS" ] && [ -z "$MISSING_FILES" ]; then
  exit 0
fi

# Build a structured message for Claude. Non-blocking — just informs.
MSG="Spotlight coverage check found issues after this edit:"
if [ -n "$ORPHANS" ]; then
  MSG="${MSG}\n\n⚠️  Orphan spotlight markers (referenced in categories.ts but no <SpotlightTarget> wrapper renders them):"
  while IFS= read -r key; do
    MSG="${MSG}\n  - SPOTLIGHT_TARGET.${key}"
  done <<< "$ORPHANS"
  MSG="${MSG}\n\nThese onboarding steps will silently fail (3s polling then no-op). Fix by either:"
  MSG="${MSG}\n  • Adding <SpotlightTarget name={SPOTLIGHT_TARGET.<key>}> around the right element, or"
  MSG="${MSG}\n  • Removing the spotlight reference from categories.ts"
fi
if [ -n "$MISSING_FILES" ]; then
  MSG="${MSG}\n\n✗ Missing attachment file(s) referenced by categories.ts:${MISSING_FILES}"
fi
MSG="${MSG}\n\nInvoke the check-spotlight-coverage skill for a full audit and to apply fixes."

# Surface to Claude via the hook protocol.
printf '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":%s}}\n' \
  "$(printf '%s' "$MSG" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')"

exit 0
