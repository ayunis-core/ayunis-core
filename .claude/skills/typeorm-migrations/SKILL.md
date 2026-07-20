---
name: typeorm-migrations
description: Creating TypeORM database migrations. Use when schema changes are needed (new columns, tables, indexes, constraints).
---

# TypeORM Database Migrations

## Golden Rule

**Never write migration files by hand.** Always auto-generate them from TypeORM entity changes. Never edit a generated migration — if it's wrong, fix the entity and regenerate.

## Entity Rules — The Source of Truth

TypeORM entities (Records) are the **single source of truth** for the database schema. Everything must be expressed through decorators. If a constraint, index, or FK exists in the database but not in an entity decorator, TypeORM will try to drop it on the next `migration:generate`.

### Relations define constraints, not loading behavior

`@ManyToOne` creates a **foreign key constraint** in the database. It does NOT mean the relation is eagerly loaded — relations are lazy by default. You control loading per-query via `relations: { ... }`.

**Always define `@ManyToOne` when a column references another table**, even if you never load the relation object:

```typescript
// CORRECT — column + relation = FK constraint in DB
@Column({ name: 'integration_id', type: 'varchar' })
integrationId: string;

@ManyToOne(() => McpIntegrationRecord, { onDelete: 'CASCADE' })
@JoinColumn({ name: 'integration_id' })
integration: McpIntegrationRecord;

// WRONG — plain column = no FK, no referential integrity
@Column({ name: 'integration_id', type: 'varchar' })
integrationId: string;
```

### All constraints must use decorators

| DB concept | Decorator |
| --- | --- |
| Foreign key | `@ManyToOne` / `@OneToOne` + `@JoinColumn` |
| Unique constraint (full) | `@Unique([...])` on class |
| Unique constraint (partial) | `@Index([...], { unique: true, where: '...' })` on class |
| Check constraint | `@Check('name', 'expression')` on class |
| Index | `@Index()` on property or `@Index([...])` on class |
| Enum column | `@Column({ type: 'enum', enum: MyEnum })` |

**Partial unique indexes** (with `WHERE` clause) cannot use `@Unique` — use `@Index` with `unique: true` and `where` instead.

If you add a value to a TypeScript enum used in `@Column({ type: 'enum' })`, you **must** generate a migration.

### Never hand-write constraint names

TypeORM generates deterministic constraint/index names. Hand-written names (e.g. `FK_my_custom_name`) will mismatch, causing perpetual drift.

## Workflow

### 1. Modify the Entity

Change the record file. Extend `BaseRecord` for `id`, `createdAt`, `updatedAt`:

```typescript
@Entity('agents')
export class AgentRecord extends BaseRecord {
  @Column({ type: 'varchar', length: 255, nullable: true })
  marketplaceSlug: string | null;
}
```

### 2. Generate the Migration

The dev stack must be running (`./dev status`).

```bash
pnpm run migration:generate:dev src/db/migrations/DescriptiveMigrationName
```

> **No `--` before the path.** pnpm forwards the trailing path straight to the script. Adding a `--` separator makes pnpm swallow the path, so TypeORM sees zero arguments and aborts with `Nicht genügend Argumente ohne Optionen: 0 vorhanden, mindestens 1 benötigt` (`ELIFECYCLE Command failed with exit code 1`). Pass the path with no `--`.

### 3. Review the Generated Migration

- Contains **only** the expected changes (no unrelated drift)
- `up()` and `down()` are symmetric
- No hand-written constraint or index names

If the migration contains unexpected drift, the local DB is out of sync. **Rebuild it — do not hand-author a migration to reconcile.** See "Fixing Migration Drift" below.

### 4. Run the Migration

```bash
pnpm run migration:run:dev
```

### 5. Verify Zero Drift

```bash
pnpm run migration:generate:dev src/db/migrations/VerifyNoDrift
```

This **must** print `No changes in database schema were found`. If it generates a file, entities and migrations are still out of sync — investigate before committing.

### 6. Validate

```bash
pnpm exec tsc --noEmit
pnpm run test
```

## Naming Convention

PascalCase describing the change:

| Change | Migration Name |
| --- | --- |
| Add a column | `AddMarketplaceSlugToAgents` |
| Create a table | `CreateTeamSharesTable` |
| Add an index | `AddIndexOnThreadCreatedAt` |
| Remove a column | `RemoveUserShareScope` |
| Add a constraint | `CascadeDeleteSharesOnScopeDelete` |

## Fixing Migration Drift

"Drift" here means: entities on the branch, the migration files, and the local Postgres schema no longer agree. Typical triggers:

- Switching between branches whose migration sets diverge (slot's Postgres volume was written by branch A, you're now on branch B).
- `pnpm run migration:generate:dev` produces surprise changes (removes/renames on things you never touched, or resurrects columns).
- Backend refuses to start with errors like `error: relation "<table>" already exists` (PG code `42P07`) or `column "..." of relation "..." does not exist`.

**Rule: rebuild the database from scratch. Do not hand-author a reconciliation migration.** Hand-written reconciliation migrations poison the migration history for every teammate and every future deploy — they are worse than the drift they were meant to fix.

### The rebuild

Shut the stack down and spin the DB up on an empty volume, then let migrations replay from zero:

```bash
# 1. Shut the stack down completely (from any worktree)
./dev down

# 2. Wipe the slot's Postgres volume so ./dev up starts from an empty DB.
#    Without -v the volume survives and the drift returns immediately.
docker compose -p ayunis-dev-<SLOT> down -v

# 3. Bring the stack back up — ./dev up replays every migration from scratch
./dev up --slot <SLOT>

# 4. Optional: reseed fixtures (see seed-database skill)
cd ayunis-core-backend && pnpm run seed:minimal:ts
```

`<SLOT>` is the slot number this worktree uses — the same one you passed to `./dev up`. See the `dev-environment` skill for slot conventions.

### After the rebuild

Verify zero drift before making further changes:

```bash
cd ayunis-core-backend
pnpm run migration:generate:dev src/db/migrations/VerifyNoDrift
# Must print: "No changes in database schema were found"
```

If a `VerifyNoDrift` file *is* produced, entities and migrations are genuinely out of sync — that's a legitimate migration to *generate* (via TypeORM), not to hand-write. Investigate which entity changed and, if the fix belongs in an earlier migration, edit *that* migration's entity source, not the reconciliation file.

## Anti-Patterns

| Don't | Why | Instead |
| --- | --- | --- |
| Write migration SQL by hand | Drift between entities and schema | Modify the entity, then auto-generate |
| Hand-author a migration to reconcile drift | Poisons migration history for teammates and deploys | Rebuild the DB (`./dev down` + wipe volume + `./dev up`) |
| Edit a generated migration | Constraint names will mismatch | Fix the entity and regenerate |
| Hand-write FK/index/constraint names | Perpetual drift on future generates | Let TypeORM name everything |
| Use `@Column` for a FK without `@ManyToOne` | No FK in the database, no referential integrity | Add `@ManyToOne` + `@JoinColumn` |
| Add enum values without a migration | DB enum won't match TypeScript enum | Generate a migration after adding values |
| Use `@Unique` for partial constraints | Produces full constraint, not partial | Use `@Index({ unique: true, where: '...' })` |
| Skip zero-drift verification | Entities and migrations may still be misaligned | Always verify after running |
| Commit without running | May fail at runtime | Always `migration:run:dev` first |
