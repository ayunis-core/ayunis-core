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
|---|---|
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
npm run migration:generate:dev -- src/db/migrations/DescriptiveMigrationName
```

### 3. Review the Generated Migration

- Contains **only** the expected changes (no unrelated drift)
- `up()` and `down()` are symmetric
- No hand-written constraint or index names

If the migration contains unexpected drift, the local DB may be out of sync. Recreate it (`DROP DATABASE` + `CREATE DATABASE`), run all migrations, then regenerate.

### 4. Run the Migration

```bash
npm run migration:run:dev
```

### 5. Verify Zero Drift

```bash
npm run migration:generate:dev -- src/db/migrations/VerifyNoDrift
```

This **must** print `No changes in database schema were found`. If it generates a file, entities and migrations are still out of sync — investigate before committing.

### 6. Validate

```bash
npx tsc --noEmit
npm run test
```

## Naming Convention

PascalCase describing the change:

| Change | Migration Name |
|---|---|
| Add a column | `AddMarketplaceSlugToAgents` |
| Create a table | `CreateTeamSharesTable` |
| Add an index | `AddIndexOnThreadCreatedAt` |
| Remove a column | `RemoveUserShareScope` |
| Add a constraint | `CascadeDeleteSharesOnScopeDelete` |

## Anti-Patterns

| Don't | Why | Instead |
|---|---|---|
| Write migration SQL by hand | Drift between entities and schema | Modify the entity, then auto-generate |
| Edit a generated migration | Constraint names will mismatch | Fix the entity and regenerate |
| Hand-write FK/index/constraint names | Perpetual drift on future generates | Let TypeORM name everything |
| Use `@Column` for a FK without `@ManyToOne` | No FK in the database, no referential integrity | Add `@ManyToOne` + `@JoinColumn` |
| Add enum values without a migration | DB enum won't match TypeScript enum | Generate a migration after adding values |
| Use `@Unique` for partial constraints | Produces full constraint, not partial | Use `@Index({ unique: true, where: '...' })` |
| Skip zero-drift verification | Entities and migrations may still be misaligned | Always verify after running |
| Commit without running | May fail at runtime | Always `migration:run:dev` first |
