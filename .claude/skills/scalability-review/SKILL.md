---
name: scalability-review
description: Review whether a change still behaves correctly as users, data, and backend instances grow — unbounded reads, missing indexes, replica-unsafe in-memory state and crons, request-path work that belongs on a queue, connection and provider budgets. Use when a change adds or modifies list endpoints, queries on growing tables, @Cron tasks, BullMQ producers/consumers, process-local state, or LLM/embedding/crawl provider calls.
---

# Scalability Review

Answer one question per change: **does this still behave correctly at 10× the users and data, and with more than one backend instance?** This is not a general performance pass — flag only failure modes that grow with load or instance count.

As of 2026-10-13 the backend runs as **one replica** (production replica count is owned by `ayunis-infra`; staging by this repo's deploy script). Check the current count before calling a replica bug latent. At one replica it is a hazard for the first scale-out rather than a live bug — flag it rather than growing the set already tracked in AYC-1258.

## When it applies

Load this skill when the diff touches any of:

- A query on a table that grows with usage (threads, messages, sources, embeddings, usage, storage objects) or a list endpoint / frontend picker backed by one
- `@Cron` tasks, BullMQ producers or consumers
- Module-level or class-level state: maps, caches, cooldowns, `isRunning` flags, in-flight promise chains
- Calls to LLM, embedding, crawl, or other external providers
- Upload, document, or file processing

Skip it for copy, styling, and pure domain logic.

## Checklist

### 1. Bounded reads

- Every list query has pagination or a `LIMIT`; nothing loads a user's or org's full history into memory.
- A new query on a growing table has an acceptable measured cost at expected volume. Check with `EXPLAIN (ANALYZE, BUFFERS)` on seeded volume, not by reading the query. Judge the cost, not the plan type: a sequential scan is fine for a broad query that reads most of the table.
- Add an index (via the `typeorm-migrations` skill) only when that plan shows one is needed. An existing selective index may already cover the query, and a non-selective column doesn't earn one.

### 2. Round trips

Delegate to `persistence-query-review` for N+1 access, check-then-act races, and avoidable reloads. Don't duplicate its rules here.

### 3. Replica safety

Assume a second instance will run the same code against the same Postgres and Redis.

- **Crons fire on every instance.** An in-process `isRunning` flag only prevents overlap within one process. A new `@Cron` must be single-flight across instances — see AYC-1258 for the agreed mechanism — or be provably idempotent and cheap when run N times concurrently.
- **Process-local state diverges.** Caches, cooldowns, rate limiters, and dedup maps are per instance. State why per-instance behavior is acceptable (as `iam/budget-alerts` documents for its cooldown), or move it to Postgres/Redis.
- **Side effects before persistence duplicate.** Sending an email or calling a provider *before* recording that it happened is at-least-once per instance. Prefer a unique constraint or conditional insert that claims the work first.

### 4. Request path vs. queue

Work that is slow or bursty and can finish asynchronously — the user does not wait on the response — belongs on BullMQ. Interactive work such as streamed chat stays in the request path; bound it with timeouts and the budgets in section 5 instead. Queued work follows `domain/sources/infrastructure/queue` (producer/consumer split, `bullmq-job.helpers.ts` defaults: bounded attempts with backoff, bounded job retention, explicit `concurrency`). For a queued job check:

- Each side effect is safe to repeat on retry: idempotent, claimed in persistence before it runs (unique constraint or conditional insert), or sent with a provider idempotency key. A deduplicated job id only prevents duplicate enqueues, not repeated side effects when an attempt fails partway and retries.
- Its concurrency is explicit and sized against the provider and DB budgets below.
- A job stuck mid-processing is recovered: sources stuck in `processing` past a timeout are marked failed (`stale-processing-cleanup.task.ts`). Copy that recovery behavior, not its scheduling — the task is a `@Cron` guarded by a process-local `isRunning` flag, which is the replica-unsafe pattern from section 3.

### 5. Connection and provider budgets

- Postgres connections = backend instances × `POSTGRES_POOL_SIZE` (default 20). BullMQ consumers run in-process and share that pool, so raising consumer `concurrency` competes with HTTP requests for connections. Don't hold a transaction open across an LLM call, stream, or HTTP request to another service.
- Streaming responses must not pin a DB connection for their duration.
- Provider calls handle 429s with backoff and respect per-org limits; a burst from one org must not starve others.

### 6. Evidence

A scalability claim needs a measurement, not reasoning:

- Query changes: `EXPLAIN` output on seeded volume.
- Hot-path or queue changes: name the metric (Prometheus via `prom-client`, AppSignal) that will show regression, adding one if none exists.
- Production behavior: query it with the `appsignal-logs` skill; state the environment the evidence came from.

## Classification

Feed findings into the Proportional Workflow:

- New replica-unsafe state, a new cron, or new queue/consumer behavior → **High-Risk Path** (concurrency-sensitive background work).
- New query or list endpoint on a growing table → at least **Standard Path**.

## Outcome

Report one **Scale notes** line in the review output: expected row counts or volume, indexes relied on, and replica safety (`single-flight` / `idempotent` / `per-instance by design` / `n/a`). When writing or updating a PR description, carry the line into it. If a finding is out of scope for the change, propose a follow-up ticket rather than expanding the change.
