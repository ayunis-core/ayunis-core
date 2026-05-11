---
name: check-spotlight-coverage
description: Audit and FIX the getting-started spotlight system for orphans, broken references, and stale wrappers. MUST be invoked automatically whenever the PostToolUse hook surfaces a "Spotlight coverage check found issues" message, OR when editing/removing components that contain a `<SpotlightTarget>` wrapper, OR when adding/changing entries in `categories.ts`, OR when the user asks to "check spotlights", "verify onboarding", or "audit spotlight coverage". After running the audit, apply fixes directly without waiting for further confirmation when the fix is obvious (e.g., re-wrapping a moved element, removing a dead reference).
---

# Check Spotlight Coverage

The onboarding system relies on three things staying in sync:

1. **Marker constants** in `ayunis-core-frontend/src/shared/lib/spotlight-targets.ts`
2. **`<SpotlightTarget>` wrappers** sprinkled across pages/widgets (apply the `data-spotlight` attribute at runtime)
3. **Step config** in `ayunis-core-frontend/src/pages/getting-started/model/categories.ts` (references those markers in `action.spotlight`)

If any of these drift apart, spotlights fail **silently** — the overlay polls for 3s then closes without surfacing an error. This skill catches that drift.

## When to run

- After moving / renaming / restructuring a page that contains an `<SpotlightTarget>` wrapper
- After adding a new step to `categories.ts`
- After removing components that were spotlight targets
- Before shipping anything that touches `src/pages/`, `src/widgets/`, or `src/features/`
- When the user explicitly asks ("check spotlights", "verify onboarding", "audit spotlight coverage")

## Steps

### 1. Collect the three sources of truth

```bash
# Constants → what names exist
cat ayunis-core-frontend/src/shared/lib/spotlight-targets.ts

# Step config → which names the onboarding steps use
grep -oE "SPOTLIGHT_TARGET\.[a-zA-Z]+" \
  ayunis-core-frontend/src/pages/getting-started/model/categories.ts \
  | sort -u

# Wrappers → which names are actually applied to DOM
grep -rn "SpotlightTarget name=" ayunis-core-frontend/src --include='*.tsx' \
  | grep -oE "SPOTLIGHT_TARGET\.[a-zA-Z]+" \
  | sort -u
```

### 2. Cross-reference

Compute three sets and report mismatches:

| Issue | Definition | Symptom |
|---|---|---|
| **Orphan step** | Name referenced in `categories.ts` but no `<SpotlightTarget>` in code | Step's spotlight fires but finds nothing → 3s polling then silent close |
| **Unused marker** | Name in `SPOTLIGHT_TARGET` but not referenced anywhere | Dead code — safe to delete |
| **Unwrapped name** | Wrapper exists but the name isn't in `SPOTLIGHT_TARGET` | Won't compile (TS narrowing) — but flag if you see one |

### 3. Verify translations exist

For each step `id` in `categories.ts` with `action.type === 'prompt'` or `action.spotlight`, check that the corresponding translation key has the right shape:

```bash
# For each step.translationKey, ensure these exist in both de + en:
#   steps.<key>.title
#   steps.<key>.description
#   steps.<key>.action
#   steps.<key>.spotlightTitle    (if action has spotlight)
#   steps.<key>.spotlightDescription (if action has spotlight)
#   steps.<key>.prompt            (if action.type === 'prompt')
```

Use `jq` or a quick grep. Missing keys fall back to empty strings — spotlight still works but the tooltip is empty.

### 4. Verify sample attachment files exist

For each `action.attachment` path in `categories.ts`, check that the file exists under `ayunis-core-frontend/public`:

```bash
grep -oE "'/getting-started-samples/[^']+'" \
  ayunis-core-frontend/src/pages/getting-started/model/categories.ts \
  | tr -d "'" \
  | while read path; do
      file="ayunis-core-frontend/public$path"
      [ -f "$file" ] && echo "  ✓ $path" || echo "  ✗ MISSING $path"
    done
```

### 5. Report

Format the output as a punch list:

```
SPOTLIGHT COVERAGE REPORT

Markers defined: 15
Markers used in steps: 13
Markers wrapped in DOM: 14

Issues:
  ⚠️  Orphan step: SPOTLIGHT_TARGET.foo
       Referenced in categories.ts but no <SpotlightTarget name={SPOTLIGHT_TARGET.foo}> found.
       → Either remove from categories.ts or add a wrapper to the relevant page.

  ⚠️  Unused marker: SPOTLIGHT_TARGET.bar
       Defined but never referenced. Safe to remove from spotlight-targets.ts.

  ✗ Missing attachment: /getting-started-samples/foo.csv
       Referenced by `analyzeData` step but file does not exist.

Translations:
  ⚠️  steps.writeEmail.spotlightTitle missing in en/getting-started.json

All other targets are in sync.
```

## Communication: ALWAYS notify, ALWAYS show the diff

**Critical:** every time this skill runs, you MUST send a clear chat message to the user *before* applying any fix. The message has three parts:

### 1. What broke
State the issue plainly — which marker, which file, why it broke (e.g. "Wrapper was removed in your last edit to `UsersSettingsPage.tsx`").

### 2. The proposed fix as a code block
Show the exact code change in a fenced code block, like:

````
**Proposed fix** in `src/pages/admin-settings/users-settings/ui/UsersSettingsPage.tsx`:

```diff
-          <InviteMenuButton />
+          <SpotlightTarget name={SPOTLIGHT_TARGET.inviteUsers}>
+            <InviteMenuButton />
+          </SpotlightTarget>
```
````

### 3. Then apply
Apply the fix via the Edit tool. Each Edit call is visible to the developer in the chat — they can see the diff.

After applying, send a short confirmation: "✓ Re-wrapped `InviteMenuButton` with `SpotlightTarget`. Test the 'Kollegen einladen' onboarding step to verify."

If the user doesn't want the fix, they'll say so. Default to applying when the cause is obvious.

## Fix workflow per issue type

### Orphan marker → element was moved or unwrapped
1. Find where the wrapper used to be: `git log -p -S 'SPOTLIGHT_TARGET.<key>' -- 'ayunis-core-frontend/src/'`
2. Identify the right element on the current page (usually the same element, now unwrapped).
3. Show the diff in chat, then apply.
4. If the element was deleted entirely, ASK before removing the step from `categories.ts`.

### Missing attachment file
1. ASK the user — they may want different content than a generic placeholder.

### Unused marker
1. ASK the user. They may plan to wire it up.

## What NOT to do

- Don't apply fixes silently. The developer must see what changed.
- Don't try to verify spotlights by *running* the app — static analysis is enough.
- Don't recreate sample attachment files without asking — content matters.

## Quick mental model

Think of spotlights as a contract between three files:

```
spotlight-targets.ts ──→ SPOTLIGHT_TARGET.foo
        │
        ├─── categories.ts: { action: { spotlight: SPOTLIGHT_TARGET.foo } }
        │       (the "I want to spotlight foo" declaration)
        │
        └─── SomePage.tsx: <SpotlightTarget name={SPOTLIGHT_TARGET.foo}>...</>
                (the "foo is HERE" anchor)
```

If any node in this triangle goes missing, the spotlight silently fails. This skill is the canary.
