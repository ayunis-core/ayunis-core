# Plan: Backport Missing Guardrails to ayunis-core

## Problem

The AI-agent repository template plan (see `/Users/daniel/agents/assistant/plans/20260219--ai-agent-repo-template/plan.md`) identified several guardrails that don't exist in ayunis-core today. Since ayunis-core is the actively developed project with real agents working on it, it should benefit from these improvements too — not just future projects cloned from the template.

## Solution

### Gap Analysis

After auditing ayunis-core against the template plan, here's what's missing:

| # | Gap | Impact | Effort |
|---|-----|--------|--------|
| 1 | **ESLint: `no-explicit-any` is `off`** | High — agents introduce `any` freely. Only 9 real occurrences in production code (7 BE, 2 FE — FE ones are all in `routeTree.gen.ts` which is already ignored). | Low — fix 7 backend files, flip to `error` |
| 2 | **ESLint: `no-floating-promises` is `warn`** | High — warnings don't block commits. Agents forget `await`. | Trivial — flip to `error`, already passes |
| 3 | **ESLint: `no-misused-promises` missing (BE)** | Medium — passing async to void callbacks | Trivial — add rule |
| 4 | **ESLint: `require-await` missing (BE)** | Medium — agents mark functions async needlessly | Trivial — add rule |
| 5 | **ESLint: new typescript-eslint rules missing** | Medium — `no-unnecessary-condition`, `no-unnecessary-type-assertion`, `prefer-nullish-coalescing`, `prefer-optional-chain`, `switch-exhaustiveness-check`, `no-duplicate-enum-values`, `consistent-type-imports`, `no-import-type-side-effects`, `eqeqeq`, `no-console` | Low-Medium — add rules, fix any violations |
| 6 | **`eslint-plugin-sonarjs` not installed** | Medium — misses cognitive complexity, identical functions, collapsible ifs | Low — install + add recommended preset, fix violations |
| 7 | **`eslint-plugin-unused-imports` not installed** | Low-Medium — agents leave import debris | Trivial — install, auto-fixes on `--fix` |
| 8 | **Backend tsconfig not strict** | High — `noImplicitAny: false`, `strictBindCallApply: false`, no `strict: true`. Currently only `strictNullChecks: true`. | Low — tested: `strict: true` + `strictPropertyInitialization: false` produces only 4 errors in one file (`tool.factory.ts`). Fix those 4, flip the switch. |
| 9 | **`scripts/check-file-size.sh` missing** | Medium — agents create god-files | Trivial — new script |
| 10 | **`madge` not installed (circular dep detection)** | Medium — agents create cycles silently | Low — install + add to pre-commit + new CI workflow |
| 11 | **`knip` not installed (dead code detection)** | Medium — unused exports/files accumulate | Low — install + new CI workflow |
| 12 | **`markdownlint-cli2` not installed** | Low — agent-edited .md files drift | Trivial — install + config + add to pre-commit |
| 13 | **No test coverage threshold** | Medium — agents can ship untested code | Trivial — add `coverageThreshold` to jest config, add to CI |
| 14 | **No `npm audit` CI workflow** | Low — agents install insecure packages | Trivial — new workflow |
| 15 | **No OpenAPI schema drift CI check** | Medium — agents forget to regenerate client | Low — new workflow |
| 16 | **No `circular-deps.yml` CI workflow** | Medium — safety net for madge | Trivial — new workflow |
| 17 | **No `dead-code.yml` CI workflow** | Medium — safety net for knip | Trivial — new workflow |
| 18 | **No `new-module` skill** | Medium — agents scaffold hexagonal modules incorrectly | Low — new skill file |
| 19 | **No `new-page` skill** | Low-Medium — agents scaffold FSD pages incorrectly | Low — new skill file |
| 20 | **File size check missing from pre-commit** | Medium — no pre-commit enforcement | Trivial — add to existing hook |
| 21 | **`madge` + `markdownlint` missing from pre-commit** | Medium — no pre-commit enforcement | Trivial — add to existing hook |

### Approach

#### Phase 1: ESLint Tightening (gaps 1-7)

This is the highest-ROI work. The backend ESLint config is notably more permissive than the frontend.

**Backend ESLint changes:**
- Flip `no-explicit-any` from `off` → `error`. Fix the 7 occurrences:
  - `src/common/errors/base.error.ts` — `[key: string]: any` → use `unknown` or a proper interface
  - `src/iam/authentication/application/decorators/current-user.decorator.ts` — example with `any` → `unknown`
  - `src/domain/mcp/.../execute-mcp-tool.use-case.ts` — `content: any` → `content: unknown`
  - `src/domain/rag/.../child-chunk.record.ts` (3 lines) — `'vector' as any` → needs TypeORM vector type workaround, keep `as any` with eslint-disable comment (legitimate TypeORM limitation)
  - `src/domain/storage/.../storage.controller.ts` — `error: any` → `error: unknown`
  - `src/domain/runs/.../runs.controller.ts` — `data: any` → proper type
  - `src/domain/runs/.../streaming-inference.service.ts` — `error: any` → `error: unknown`
- Flip `no-floating-promises` from `warn` → `error`
- Add `no-misused-promises: error`
- Add `require-await: error`
- Add all new typescript-eslint rules from the template plan §3a
- Install + configure `eslint-plugin-sonarjs` (recommended preset)
- Install + configure `eslint-plugin-unused-imports`

**Frontend ESLint changes:**
- Flip `no-explicit-any` from `off` → `error` (already clean — only `routeTree.gen.ts` has `any`, which is in the ignore list)
- Promote other `warn` rules to `error`: `no-floating-promises`, `no-misused-promises`, `require-await`
- Add same new rules as backend
- Install sonarjs + unused-imports

**Fixing violations:** After adding sonarjs, there will likely be some cognitive-complexity and no-identical-functions violations. These should be fixed, not suppressed — they represent real code quality issues.

#### Phase 2: Strict TypeScript Backend (gap 8)

Enable `strict: true` on the backend with `strictPropertyInitialization: false` (TypeORM records and DTOs use decorators that initialize properties, so the compiler can't see them).

This produces only 4 errors in `src/domain/tools/application/tool.factory.ts` — all `TS2345` (argument type mismatch with abstract constructors). Fix those 4 lines.

This is a **massive** improvement for agent-generated code quality going forward. `strict: true` enables:
- `strictNullChecks` ✅ (already on)
- `noImplicitAny` (was `false` — tested, 0 new errors)
- `strictBindCallApply` (was `false`)
- `strictFunctionTypes`
- `alwaysStrict`
- `useUnknownInCatchVariables`

Also add `noImplicitReturns: true` and `noUncheckedIndexedAccess: true` for extra safety.

#### Phase 3: New Scripts + Pre-commit Updates (gaps 9, 20, 21)

- Create `scripts/check-file-size.sh` — fails if any provided `.ts`/`.tsx` file exceeds 300 lines. Excludes generated, migrations, tests.
- Install `madge` and `markdownlint-cli2` as root devDependencies.
- Create `.markdownlint.jsonc` config (disable line-length rule, reasonable defaults).
- Update `.husky/pre-commit` to add three new parallel jobs:
  - `madge --circular` for backend
  - File size check for both packages
  - `markdownlint` for staged `.md` files

#### Phase 4: New CI Workflows (gaps 14-17)

- `circular-deps.yml` — madge --circular for both packages on PR
- `dead-code.yml` — knip for both packages on PR
- `security-audit.yml` — `npm audit --audit-level=high` on PR + weekly schedule
- `api-schema-drift.yml` — Regenerate orval client, `git diff --exit-code` on generated dir

#### Phase 5: Test Coverage + Remaining (gap 13)

- Add `coverageThreshold` to `ayunis-core-backend/jest.config.ts`:
  ```
  global: { branches: 70, functions: 80, lines: 80, statements: 80 }
  ```
- Verify current coverage meets these thresholds. If not, adjust thresholds to current levels and ratchet up over time.
- Update `backend-tests.yml` to fail on coverage threshold miss.

#### Phase 6: New Skills (gaps 18-19)

- `.pi/skills/new-module/SKILL.md` — Step-by-step guide for agents to scaffold a new hexagonal backend module. Includes the exact directory structure, file templates for each layer (entity, port, use case, record, mapper, controller, module, SUMMARY.md), and wiring into app.module.ts.
- `.pi/skills/new-page/SKILL.md` — Step-by-step guide for agents to scaffold a new FSD frontend page. Includes directory structure, component template, barrel export, route file, and link from existing navigation.

### Key Decisions

**Why `strictPropertyInitialization: false` instead of fixing all 672 records/DTOs?**
TypeORM and class-validator/class-transformer decorators handle property initialization outside the constructor. Adding `!` (definite assignment assertion) to 672 properties is pure noise. Disabling this one sub-flag of `strict` is the pragmatic choice — every other strict flag provides genuine safety.

**Why not add `noUncheckedIndexedAccess` to backend immediately?**
This flag makes every `array[index]` and `record[key]` return `T | undefined`. It's the correct thing to do, but it would surface many violations in existing code (every `.find()` result, every map/reduce, every parsed JSON access). Add it, but be prepared to fix a wave of violations. If the violation count is too high, defer to a follow-up task.

**Why `no-console: warn` not `error`?**
The backend legitimately uses `console.log` in a few places (bootstrap, CLI commands). Using `warn` flags new additions without blocking them. The pre-commit uses `--max-warnings=0` in check mode, so new warnings still block commits. But `--fix` mode (the default in pre-commit) doesn't auto-fix console.log, so it acts as an `error` in practice during pre-commit and as a `warn` during development.

**Why add sonarjs cognitive-complexity when lizard already checks CCN?**
They measure different things. Cyclomatic complexity counts branches. Cognitive complexity measures how hard code is to *understand* — deeply nested code scores higher even with the same branch count. An agent can write a function with CCN=8 (under lizard's limit) that's still incomprehensible due to nesting. sonarjs catches this.

### Relevant Files

| File | Path |
|------|------|
| Backend ESLint | `/Users/daniel/dev/ayunis/ayunis-core/ayunis-core-backend/eslint.config.mjs` |
| Frontend ESLint | `/Users/daniel/dev/ayunis/ayunis-core/ayunis-core-frontend/eslint.config.mjs` |
| Backend tsconfig | `/Users/daniel/dev/ayunis/ayunis-core/ayunis-core-backend/tsconfig.json` |
| Frontend tsconfig | `/Users/daniel/dev/ayunis/ayunis-core/ayunis-core-frontend/tsconfig.json` |
| Pre-commit hook | `/Users/daniel/dev/ayunis/ayunis-core/.husky/pre-commit` |
| Complexity script | `/Users/daniel/dev/ayunis/ayunis-core/scripts/check-complexity.sh` |
| Duplication script | `/Users/daniel/dev/ayunis/ayunis-core/scripts/check-duplication.sh` |
| CI workflows | `/Users/daniel/dev/ayunis/ayunis-core/.github/workflows/` |
| Skills | `/Users/daniel/dev/ayunis/ayunis-core/.pi/skills/` |
| Root package.json | `/Users/daniel/dev/ayunis/ayunis-core/package.json` |
| Backend jest config | `/Users/daniel/dev/ayunis/ayunis-core/ayunis-core-backend/package.json` (jest section) |
| Template plan | `/Users/daniel/agents/assistant/plans/20260219--ai-agent-repo-template/plan.md` |
