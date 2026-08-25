---
name: persistence-query-review
description: Design and review Ayunis Core database access for avoidable round trips, check-then-act races, N+1 queries, and stale writes. Use when modifying or reviewing repositories, finders, QueryBuilder code, or application code that issues database calls in loops.
---

# Persistence Query Review

Choose the simplest database operation that preserves the required behavior under concurrency. Minimize round trips as part of that design; do not trade correctness or clear module boundaries for fewer queries.

## Review the SQL Shape

For every changed persistence path:

1. Trace the complete request-to-database call path, not only the changed method.
2. Enumerate the SQL statements and network round trips on the happy path and relevant error paths.
3. State what each read contributes: authorization data, domain decisions, existence detection, returned state, or relationship loading.
4. Remove or combine reads that do not contribute independently observable behavior.

Challenge these patterns explicitly:

- A read used only to check existence before a write. Prefer the write's affected-row count or returned rows; a pre-read creates a check-then-act race.
- A write followed by a read used only to obtain the updated row. On PostgreSQL, prefer one `UPDATE ... RETURNING` or `INSERT ... RETURNING` statement.
- `save()` for an update-only contract. It may select or insert and can write stale aggregate fields; use an update operation that cannot create a missing record.
- Database calls inside loops. Replace N+1 access with a join, relation load, batched `IN` query, or set-based write when that preserves behavior.
- Detached aggregates writing fields owned by another operation. Update only fields owned by the current operation, or use explicit concurrency control.

## Preserve Semantics

Before combining statements, identify the actual contract:

- If current data is needed for authorization or a domain decision, the read is meaningful. Use a transaction or conditional write when the decision must remain valid through the write.
- If missing data must produce a domain error, derive it from zero affected or returned rows when possible.
- Use an upsert only when creation on absence is explicitly intended.
- If multiple statements are genuinely required to maintain an invariant, use the appropriate transaction and isolation or locking strategy. Do not remove them merely to reduce a query count.
- Treat QueryBuilder and database-specific SQL as infrastructure-adapter details. Keep application ports and domain code persistence-agnostic.

For TypeORM on PostgreSQL, `Repository.update()` is suitable when only the affected-row result is needed. Use QueryBuilder with `.returning(...)` when the operation must atomically return the authoritative stored row.

## Verify the Decision

- Add behavioral coverage for the contract: success, missing row, concurrent/stale-field risk, and returned database-owned fields where relevant.
- When query count is a material performance contract, verify emitted SQL or round trips with a repository integration test or scoped instrumentation. Do not make domain tests depend on QueryBuilder call chains.
- Use `EXPLAIN (ANALYZE, BUFFERS)` with representative data before claiming a query or new index is faster. Do not add indexes speculatively.
- Report the before-and-after query shape and round-trip count in the review or PR summary.

## Review Outcome

Flag a persistence change when an avoidable round trip, N+1 pattern, stale write, or check-then-act race remains. If extra statements are necessary, record the behavior or invariant that requires them.
