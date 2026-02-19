# Implementation: Backport Missing Guardrails to ayunis-core

> Plan: [plan.md](plan.md)

## Overview

Adds the guardrails identified in the template plan that are missing from ayunis-core: stricter ESLint (sonarjs, unused-imports, no-explicit-any, new TS rules), strict backend TypeScript, file size checks, madge, knip, markdownlint, new CI workflows, coverage thresholds, and two new agent skills.

## Notes from Research

- **`strict: true`** on backend with `strictPropertyInitialization: false` → only 4 errors in `tool.factory.ts` (TS2345, abstract constructor args). Adding `noImplicitReturns` adds 0 extra.
- **`noUncheckedIndexedAccess`** → 194 errors. **Deferred** to a follow-up task.
- **`no-explicit-any`** → 7 backend production files, 3 of which are `'vector' as any` in TypeORM records (need eslint-disable).
- **File size**: 15+ backend files and 10+ frontend files exceed 300 lines. Threshold set to **500 lines** for ayunis-core (controllers are inherently long with Swagger decorators). Greenfield template can use 300.
- **`console.*`**: 22 occurrences in production code (main.ts, CLI, clients, sentry, seeds). Use `no-console: warn` + allow `console.error` and `console.warn` in specific patterns.

## Steps

### ✅ Step 1 — Install ESLint plugins (backend + frontend)

**Scope:** ONLY `ayunis-core-backend/package.json`, `ayunis-core-frontend/package.json`

**Edits:**
- `ayunis-core-backend/package.json` — Add devDependencies: `eslint-plugin-sonarjs`, `eslint-plugin-unused-imports`
- `ayunis-core-frontend/package.json` — Add devDependencies: `eslint-plugin-sonarjs`, `eslint-plugin-unused-imports`

**Validation:**
```
cd ayunis-core-backend && npm install && cd ../ayunis-core-frontend && npm install
```

**DO NOT touch:** Any `eslint.config.mjs`, any `src/` files, `.husky/`, `.github/`

---

### ✅ Step 2 — Fix backend `any` occurrences

**Scope:** ONLY the 7 backend source files with `any` in production code

**Edits:**
- `ayunis-core-backend/src/common/errors/base.error.ts` — Change `[key: string]: any` → `[key: string]: unknown`
- `ayunis-core-backend/src/iam/authentication/application/decorators/current-user.decorator.ts` — Change `any` in JSDoc example → `unknown`
- `ayunis-core-backend/src/domain/mcp/application/use-cases/execute-mcp-tool/execute-mcp-tool.use-case.ts` — Change `content: any` → `content: unknown`
- `ayunis-core-backend/src/domain/rag/indexers/infrastructure/adapters/parent-child-index/infrastructure/persistence/schema/child-chunk.record.ts` — Add `// eslint-disable-next-line @typescript-eslint/no-explicit-any` above each of the 3 `'vector' as any` lines (legitimate TypeORM limitation — pgvector type isn't in TypeORM's type system)
- `ayunis-core-backend/src/domain/storage/presenters/https/storage.controller.ts` — Change `error: any` → `error: unknown`, add type narrowing
- `ayunis-core-backend/src/domain/runs/presenters/http/runs.controller.ts` — Change `data: any` → proper type or `unknown`
- `ayunis-core-backend/src/domain/runs/application/services/streaming-inference.service.ts` — Change `let error: any` → `let error: unknown`

**Tests:**
- `npx tsc --noEmit` passes (no type errors introduced by `unknown` replacements)
- `npm run test` passes (no runtime changes)

**Validation:**
```
cd ayunis-core-backend && npx tsc --noEmit && npm run test
```

**DO NOT touch:** `eslint.config.mjs` (rules not changed yet), frontend, any other backend files

---

### Step 3 — Tighten backend ESLint config

**Scope:** ONLY `ayunis-core-backend/eslint.config.mjs`

**Edits:**
- `ayunis-core-backend/eslint.config.mjs` — Full rewrite of rules section:
  - Add imports: `eslint-plugin-sonarjs`, `eslint-plugin-unused-imports`
  - Add `sonarjs.configs.recommended` to config array
  - Production rules promoted to `error`:
    - `@typescript-eslint/no-explicit-any` (was `off`)
    - `@typescript-eslint/no-floating-promises` (was `warn`)
  - New production rules (`error`):
    - `@typescript-eslint/no-misused-promises`
    - `@typescript-eslint/require-await`
    - `@typescript-eslint/no-unnecessary-condition`
    - `@typescript-eslint/no-unnecessary-type-assertion`
    - `@typescript-eslint/switch-exhaustiveness-check`
    - `@typescript-eslint/no-duplicate-enum-values`
    - `eqeqeq`
    - `unused-imports/no-unused-imports`
  - New production rules (`warn`):
    - `@typescript-eslint/prefer-nullish-coalescing`
    - `@typescript-eslint/prefer-optional-chain`
    - `@typescript-eslint/consistent-type-imports`
    - `@typescript-eslint/no-import-type-side-effects`
    - `no-console` (with `allow: ['warn', 'error']`)
  - Test file overrides: add `no-explicit-any: off`, `require-await: off`, `no-console: off`, `@typescript-eslint/no-unnecessary-condition: off` to existing test relaxations
  - Disable sonarjs rules that overlap with lizard: `sonarjs/cognitive-complexity` → keep but set threshold to 15 (lizard handles the stricter CCN check)

**Tests:**
- `npm run lint` passes (fix any new violations surfaced by sonarjs or new rules)

**Validation:**
```
cd ayunis-core-backend && npm run lint && npx tsc --noEmit && npm run test
```

Note: This step may surface violations from sonarjs (identical functions, collapsible ifs, etc.) or from `no-unnecessary-condition`, `prefer-nullish-coalescing`, etc. Fix them all — they represent real code quality issues. If a sonarjs violation is a false positive (e.g., `no-identical-functions` on short factory methods), add a targeted eslint-disable comment.

**DO NOT touch:** Frontend ESLint, backend source files (except to fix lint violations), `.husky/`, `.github/`

---

### Step 4 — Tighten frontend ESLint config

**Scope:** ONLY `ayunis-core-frontend/eslint.config.mjs`

**Edits:**
- `ayunis-core-frontend/eslint.config.mjs` — Matching changes:
  - Add imports: `eslint-plugin-sonarjs`, `eslint-plugin-unused-imports`
  - Add `sonarjs.configs.recommended` to config array
  - Promote `@typescript-eslint/no-explicit-any` from `off` → `error`
  - Promote `@typescript-eslint/no-floating-promises` from `warn` → `error`
  - Promote `@typescript-eslint/no-misused-promises` from `warn` → `error`
  - Promote `@typescript-eslint/require-await` from `warn` → `error`
  - Promote other `warn` rules to `error` where already present: `no-unsafe-argument`, `no-unsafe-assignment`, `no-unsafe-member-access`, `no-unsafe-call`, `no-unsafe-return`, `prefer-promise-reject-errors`, `no-base-to-string`, `restrict-template-expressions`, `no-unused-expressions`, `await-thenable`, `no-redundant-type-constituents`
  - Add new rules (same as backend): `no-unnecessary-condition`, `no-unnecessary-type-assertion`, `switch-exhaustiveness-check`, `no-duplicate-enum-values`, `eqeqeq`, `unused-imports/no-unused-imports`, `prefer-nullish-coalescing`, `prefer-optional-chain`, `consistent-type-imports`, `no-import-type-side-effects`, `no-console`
  - Update test relaxations to match backend
  - Set `sonarjs/cognitive-complexity` threshold to 15

**Tests:**
- `npm run lint` passes (fix any violations)

**Validation:**
```
cd ayunis-core-frontend && npm run lint && npx tsc --noEmit && npm run build
```

**DO NOT touch:** Backend, `.husky/`, `.github/`, frontend source files (except to fix lint violations)

---

### Step 5 — Enable strict TypeScript on backend

**Scope:** ONLY `ayunis-core-backend/tsconfig.json` and `ayunis-core-backend/src/domain/tools/application/tool.factory.ts`

**Edits:**
- `ayunis-core-backend/tsconfig.json` — Replace individual strict flags with:
  ```json
  "strict": true,
  "strictPropertyInitialization": false,
  "noImplicitReturns": true,
  ```
  Remove: `"strictNullChecks": true` (redundant — included in `strict`), `"noImplicitAny": false` (now covered by `strict`), `"strictBindCallApply": false` (now covered by `strict`), `"noFallthroughCasesInSwitch": false` (now enabled by `strict` + `noFallthroughCasesInSwitch` isn't part of strict but let's enable it explicitly too)
- `ayunis-core-backend/src/domain/tools/application/tool.factory.ts` — Fix 4 TS2345 errors. The `requireArrayContext` function's `itemType` parameter uses `abstract new (...args: unknown[]) => T` but `Source`, `DataSource`, and `Skill` constructors have specific argument types. Fix by widening the constructor signature: `abstract new (...args: never[]) => T` or using a type assertion at call sites.

**Tests:**
- `npx tsc --noEmit` passes with 0 errors
- `npm run test` passes
- `npm run lint` passes

**Validation:**
```
cd ayunis-core-backend && npx tsc --noEmit && npm run lint && npm run test
```

**DO NOT touch:** Frontend tsconfig, any other backend source files, `.husky/`, `.github/`

---

### Step 6 — Create file size check script

**Scope:** ONLY `scripts/check-file-size.sh`

**Creates:**
- `scripts/check-file-size.sh` — Shell script:
  - Accepts file paths as arguments
  - Threshold: 500 lines (configurable via `FILE_SIZE_THRESHOLD` env var)
  - Excludes: `/generated/`, `/migrations/`, `*.spec.ts`, `*.test.ts`, `*.test.tsx`, `*.record.ts`
  - For each file over threshold: print filename, line count, and threshold
  - Exit 1 if any file exceeds threshold, exit 0 otherwise
  - Colored output matching existing scripts' style

**Tests:**
- `./scripts/check-file-size.sh` with no args → exits 0
- Create a temp 501-line .ts file → script flags it → delete temp file

**Validation:**
```
chmod +x scripts/check-file-size.sh && ./scripts/check-file-size.sh && echo "OK"
```

**DO NOT touch:** `scripts/check-complexity.sh`, `scripts/check-duplication.sh`, backend, frontend, `.husky/`

---

### Step 7 — Install root dependencies (madge, knip, markdownlint-cli2)

**Scope:** ONLY root `package.json`, `.markdownlint.jsonc`

**Edits:**
- `package.json` — Add devDependencies: `madge`, `knip`, `markdownlint-cli2`

**Creates:**
- `.markdownlint.jsonc` — Config:
  ```jsonc
  {
    "MD013": false,        // Disable line length (documentation wraps naturally)
    "MD033": false,        // Allow inline HTML (common in GitHub markdown)
    "MD041": false,        // Don't require first line to be H1 (SUMMARY.md files)
    "MD024": { "siblings_only": true }  // Allow duplicate headings in different sections
  }
  ```

**Validation:**
```
npm install && npx markdownlint-cli2 --help && npx madge --version && npx knip --help
```

**DO NOT touch:** Backend, frontend, `.husky/`, `.github/`, `scripts/`

---

### Step 8 — Update pre-commit hook (file size, madge, markdownlint)

**Scope:** ONLY `.husky/pre-commit`

**Edits:**
- `.husky/pre-commit` — Add three new parallel jobs to the existing hook:
  
  1. **`run_be_madge`** — Circular dependency check for backend:
     ```bash
     npx madge --circular --extensions ts ayunis-core-backend/src/
     ```
     Writes status to `$STATUS_DIR/be_madge.status`
  
  2. **`run_file_size`** — File size check for all staged TS/TSX files:
     ```bash
     ./scripts/check-file-size.sh $STAGED_TS_FILES
     ```
     Writes status to `$STATUS_DIR/file_size.status`
  
  3. **`run_markdownlint`** — Markdown lint for staged .md files:
     ```bash
     npx markdownlint-cli2 $MD_STAGED_FILES
     ```
     Writes status to `$STATUS_DIR/markdownlint.status`
  
  - Add `MD_STAGED` variable to detect staged `.md` files
  - Launch all three as background jobs alongside existing ones
  - Add status collection and summary output for the three new checks
  - Launch madge + file size when backend/frontend TS files are staged
  - Launch markdownlint when `.md` files are staged

**Tests:**
- Stage a backend `.ts` file → pre-commit runs all existing checks PLUS madge, file size
- Stage a `.md` file → markdownlint runs
- All existing checks still work

**Validation:**
```
# Test with a trivial staged file
echo "// test" > /tmp/test-precommit.ts
# (manual verification — pre-commit runs on actual git commit)
```

**DO NOT touch:** `.husky/commit-msg`, `scripts/`, backend/frontend source, `.github/`

---

### Step 9 — New CI workflow: circular-deps.yml

**Scope:** ONLY `.github/workflows/circular-deps.yml`

**Creates:**
- `.github/workflows/circular-deps.yml` — On PR:
  - Backend job: `npx madge --circular --extensions ts ayunis-core-backend/src/`
  - Frontend job: `npx madge --circular --extensions ts,tsx ayunis-core-frontend/src/`
  - Node 20, npm cache, install deps in each package
  - Triggered on `*.ts` / `*.tsx` changes

**Validation:**
```
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/circular-deps.yml'))" && echo "✅ valid"
```

**DO NOT touch:** Other workflows, backend, frontend, `.husky/`

---

### Step 10 — New CI workflow: dead-code.yml

**Scope:** ONLY `.github/workflows/dead-code.yml`

**Creates:**
- `.github/workflows/dead-code.yml` — On PR:
  - Backend job: `cd ayunis-core-backend && npx knip`
  - Frontend job: `cd ayunis-core-frontend && npx knip`
  - Node 20, npm cache
  - Triggered on `*.ts` / `*.tsx` changes
  - Needs knip config: create `ayunis-core-backend/knip.json` and `ayunis-core-frontend/knip.json` with entry points and project patterns, ignoring generated/migration files

**Creates (also):**
- `ayunis-core-backend/knip.json` — Knip configuration:
  ```json
  {
    "$schema": "https://unpkg.com/knip@latest/schema.json",
    "entry": ["src/main.ts", "src/cli/main.ts"],
    "project": ["src/**/*.ts"],
    "ignore": ["src/db/migrations/**", "**/*.spec.ts", "**/*.test.ts"],
    "ignoreDependencies": ["tsconfig-paths"]
  }
  ```
- `ayunis-core-frontend/knip.json` — Knip configuration:
  ```json
  {
    "$schema": "https://unpkg.com/knip@latest/schema.json",
    "entry": ["src/main.tsx"],
    "project": ["src/**/*.{ts,tsx}"],
    "ignore": ["src/shared/api/generated/**", "src/app/routeTree.gen.ts"]
  }
  ```

Note: First run of knip may report many existing unused exports. If the count is high, add an `--ignore-known` equivalent or create a baseline. The CI workflow should initially run with `|| true` (report-only) and be tightened once the baseline is clean.

**Validation:**
```
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/dead-code.yml'))" && echo "✅ valid"
```

**DO NOT touch:** Other workflows, backend/frontend source, `.husky/`

---

### Step 11 — New CI workflow: security-audit.yml

**Scope:** ONLY `.github/workflows/security-audit.yml`

**Creates:**
- `.github/workflows/security-audit.yml` — On PR + weekly schedule (cron: `0 9 * * 1`):
  - Backend job: `cd ayunis-core-backend && npm audit --audit-level=high`
  - Frontend job: `cd ayunis-core-frontend && npm audit --audit-level=high`
  - Node 20, npm cache
  - Allow failure on schedule (notification only), block on PR

**Validation:**
```
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/security-audit.yml'))" && echo "✅ valid"
```

**DO NOT touch:** Other workflows, backend, frontend, `.husky/`

---

### Step 12 — New CI workflow: api-schema-drift.yml

**Scope:** ONLY `.github/workflows/api-schema-drift.yml`

**Creates:**
- `.github/workflows/api-schema-drift.yml` — On PR when backend source changes:
  - Start Postgres service container
  - Install backend deps, build, run migrations
  - Start backend in background, wait for health
  - In frontend dir: run `npm run openapi:update`
  - Check `git diff --exit-code ayunis-core-frontend/src/shared/api/generated/`
  - If diff exists → fail with message "API client is out of date. Run `npm run openapi:update` in the frontend."

**Validation:**
```
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/api-schema-drift.yml'))" && echo "✅ valid"
```

**DO NOT touch:** Other workflows, backend, frontend source, `.husky/`

---

### Step 13 — Add test coverage thresholds

**Scope:** ONLY `ayunis-core-backend/package.json` (jest config section), `.github/workflows/backend-tests.yml`

**Edits:**
- `ayunis-core-backend/package.json` — Add `coverageThreshold` to the `jest` section:
  ```json
  "coverageThreshold": {
    "global": {
      "branches": 50,
      "functions": 60,
      "lines": 60,
      "statements": 60
    }
  }
  ```
  Note: Starting with conservative thresholds. Run `npm run test:cov` first to check current levels and adjust upward if actual coverage is higher. The goal is to set the floor at current levels and ratchet up over time.

- `.github/workflows/backend-tests.yml` — Change `npm run test:cov` to `npm run test -- --coverage --coverageThreshold='{}'` or simply ensure the jest config threshold is respected (it is by default when `coverageThreshold` is set).

**Tests:**
- `npm run test:cov` passes (thresholds met)

**Validation:**
```
cd ayunis-core-backend && npm run test:cov
```

**DO NOT touch:** Backend source, frontend, `.husky/`, other workflows

---

### Step 14 — New skill: new-module

**Scope:** ONLY `.pi/skills/new-module/`

**Creates:**
- `.pi/skills/new-module/SKILL.md` — Step-by-step guide for agents to scaffold a new hexagonal backend module. Contents:
  - Skill metadata (name, description)
  - Directory structure template:
    ```
    src/domain/<module>/
    ├── SUMMARY.md
    ├── domain/
    │   ├── <entity>.entity.ts
    │   └── value-objects/
    ├── application/
    │   ├── ports/<entities>-repository.port.ts
    │   ├── use-cases/<action>/<action>.command.ts
    │   ├── use-cases/<action>/<action>.use-case.ts
    │   ├── use-cases/<action>/<action>.use-case.spec.ts
    │   └── <module>.errors.ts
    ├── infrastructure/
    │   └── persistence/postgres/
    │       ├── schema/<entity>.record.ts
    │       ├── mappers/<entity>.mapper.ts
    │       └── postgres-<entities>.repository.ts
    ├── presenters/http/
    │   ├── dto/create-<entity>.dto.ts
    │   ├── dto/<entity>-response.dto.ts
    │   ├── mappers/<entity>-dto.mapper.ts
    │   └── <entities>.controller.ts
    └── <module>.module.ts
    ```
  - File templates for each file type (entity with randomUUID(), port as abstract class, record extending BaseRecord, mapper with toDomain/toRecord, module with port→adapter binding)
  - Wiring checklist: import module in app.module.ts, generate migration
  - Reference to `ayunis-core-backend-dev` skill for TDD workflow
  - Reference to `ayunis-core-migrations` skill for schema changes
  - Example: the `items` module from the shares module pattern (reference: `/Users/daniel/dev/ayunis/ayunis-core/ayunis-core-backend/src/domain/shares/`)

**Validation:**
```
[ -f .pi/skills/new-module/SKILL.md ] && echo "✅ exists"
```

**DO NOT touch:** Other skills, backend, frontend, `.husky/`, `.github/`

---

### Step 15 — New skill: new-page

**Scope:** ONLY `.pi/skills/new-page/`

**Creates:**
- `.pi/skills/new-page/SKILL.md` — Step-by-step guide for agents to scaffold a new FSD frontend page. Contents:
  - Skill metadata (name, description)
  - Directory structure:
    ```
    src/pages/<page-name>/
    ├── ui/<PageName>Page.tsx
    └── index.ts
    src/app/routes/<page-name>.tsx
    ```
  - Template for page component (functional component with proper imports)
  - Template for barrel export
  - Template for route file (TanStack Router `createFileRoute`)
  - FSD rules reminder: page can import from widgets, features, shared — nothing else
  - Checklist: create files, verify lint, verify deps:check, verify build
  - Reference to `ayunis-core-frontend-dev` skill for validation workflow

**Validation:**
```
[ -f .pi/skills/new-page/SKILL.md ] && echo "✅ exists"
```

**DO NOT touch:** Other skills, backend, frontend source, `.husky/`, `.github/`

---

### Step 16 — Update AGENTS.md and backend-dev / frontend-dev skills

**Scope:** ONLY `AGENTS.md`, `.pi/skills/ayunis-core-backend-dev/SKILL.md`, `.pi/skills/ayunis-core-frontend-dev/SKILL.md`

**Edits:**
- `AGENTS.md` — Add to Development Skills section:
  - `new-module` skill pointer
  - `new-page` skill pointer
  - Add a "Validation Quick Reference" section with exact commands
  - Add note about strict TypeScript and `no-explicit-any: error`

- `.pi/skills/ayunis-core-backend-dev/SKILL.md` — Update:
  - Add `no-explicit-any` rule to anti-patterns table
  - Add note about `strict: true` (no more implicit any, strictBindCallApply, etc.)
  - Mention sonarjs cognitive complexity in complexity section
  - Add `no-console` to anti-patterns (use Logger instead)

- `.pi/skills/ayunis-core-frontend-dev/SKILL.md` — Update:
  - Same `no-explicit-any`, sonarjs notes
  - Add file size limit note (500 lines)

**Validation:**
```
# Verify all skill references in AGENTS.md point to existing files
grep -oP '`[a-z-]+`' AGENTS.md | sort -u
ls .pi/skills/
```

**DO NOT touch:** Backend/frontend source, `.husky/`, `.github/`

---

### Step 17 — Final validation sweep

**Scope:** ALL files (read-only verification)

**Tests — full sweep:**
1. Backend lint: `cd ayunis-core-backend && npm run lint`
2. Backend typecheck: `npx tsc --noEmit` (strict mode, 0 errors)
3. Backend tests: `npm run test`
4. Backend deps: `npm run deps:check`
5. Frontend lint: `cd ayunis-core-frontend && npm run lint`
6. Frontend typecheck: `npx tsc --noEmit`
7. Frontend build: `npm run build`
8. Frontend deps: `npm run deps:check`
9. Scripts: `./scripts/check-complexity.sh && ./scripts/check-file-size.sh`
10. CI workflows: all YAML files parse
11. Skills: all SKILL.md files exist
12. Pre-commit: stage a backend .ts file + a .md file, verify all checks trigger

**Validation:**
```
cd ayunis-core-backend && npm run lint && npx tsc --noEmit && npm run test && npm run deps:check
cd ../ayunis-core-frontend && npm run lint && npx tsc --noEmit && npm run build && npm run deps:check
cd .. && for f in .github/workflows/*.yml; do python3 -c "import yaml; yaml.safe_load(open('$f'))" && echo "✅ $f"; done
for f in .pi/skills/*/SKILL.md; do [ -f "$f" ] && echo "✅ $f"; done
```

**DO NOT touch:** Nothing — read-only verification only.
