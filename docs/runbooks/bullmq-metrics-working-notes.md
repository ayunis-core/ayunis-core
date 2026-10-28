# AYC-1038 working notes

Classification: High-Risk — concurrency-sensitive background work and external
telemetry. No authentication, sharing, tenant-access, migration, destructive data,
public API, billing, secret-storage, or deployment changes are planned. The
backend CI test job adds Redis to run the durable queue integration coverage.

Ownership: BullMQ/Redis → queue sampler → AppSignal gauges; consumer → safe job
telemetry → AppSignal distributions/tags; document stage → child span. UI, HTTP
contracts, application/domain policy, persisted sources, caches, and external
document providers do not change behavior.

| Transition / failure                           | Expected outcome                                                                                    | Check                               |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Empty → waiting → active → completed/failed    | Queue-specific gauges; empty age is zero                                                            | Sampler test and Redis integration  |
| Retry with older enqueue timestamp             | Oldest age includes retried jobs anywhere in waiting list                                           | Sampler test                        |
| Retention/removal → recreation                 | Counts reflect current Redis inventory, not lifetime totals                                         | Redis integration                   |
| Retryable → final / expected permanent failure | One retry or terminal counter per classified attempt, including quietly completed expected failures | Failure classification tests        |
| Successful / thrown / skipped job              | Wait and processing durations; original result/error preserved                                      | Telemetry tests and consumer suites |
| Sensitive payload / error / stage return       | Only operational identifiers and numeric durations exported                                         | Privacy tests                       |
| AppSignal or Redis unavailable                 | Business processing unchanged; failed sample does not emit false zeros                              | Failure tests                       |
| Concurrent samples / replicas                  | Local overlap skipped; global gauges idempotent, counters only at execution owner                   | Sampler concurrency tests           |

Staging metrics, child spans, and alert delivery require the new revision to run
on the named staging environment. Local tests cannot prove delivery.

Superseded atomic-scan probe: isolated Redis 7 container on localhost:32768, 2026-10-14.
Five whole-sampler measurements at 1,000 waiting jobs: 73.07, 53.21, 48.74,
32.94, 18.92 ms; at 10,000: 87.82, 59.15, 117.82, 78.11, 151.09 ms.
These measured the entire sample, not Redis's blocked duration. Review rejected
holding Redis atomically across every waiting job; that implementation is removed.

Review decision: use normal LRANGE/HGET commands in batches of 100, with at most
100 timestamp requests in flight and each list's scan bounded by its initial
length. Concurrent dequeues can hide an older job in one sample; accept this
best-effort accuracy tradeoff rather than holding Redis across the whole backlog.
Tests demonstrate both the missed moving boundary and recovery on the next stable
sample, plus concurrent enqueue bounds, removed hashes, read errors, and paused
queues. Total work still grows with backlog and is repeated per replica; no DB
query or index participates.

Revised-reader probe: isolated Redis 7 on localhost:32769, 2026-10-14.
Whole samples with no competing probe: 17.68–26.85 ms at 1,000 waiting jobs;
71.98–182.24 ms at 10,000. A second Redis client issuing PINGs concurrently
made progress throughout five samples: 55 replies, max 3.66 ms at 1,000 jobs;
478 replies, max 7.09 ms at 10,000. Whole-sample time is not Redis blocked time.
This local probe demonstrates interleaving, not a production latency guarantee.

Review observability fix: all five AppSignal charts now use
`drawNullAsZero: false`, verified by CLI read-back in staging and production.
Missing counter samples remain gaps, consistent with the triggers.

AppSignal configuration verified on 2026-10-14: five dashboard charts and nine
BullMQ triggers per environment. All production triggers have email and Slack;
staging triggers have email because staging exposes no Slack notifier.

Local validation commands (isolated worktree, Redis localhost:32768):

- `pnpm run build:deps` from ayunis-core-backend.
- `pnpm exec tsc --noEmit` from ayunis-core-backend: passed.
- Changed-file `pnpm exec eslint ... --max-warnings=0 --rule '{"max-params":"off"}'`: passed.
- `pnpm run deps:check`: passed (11 known baseline violations ignored).
- Initial queue checks passed on port 32768. The review revision uses isolated Redis on port 32769:
  `QUEUE_TELEMETRY_REDIS_PORT=32769 NODE_OPTIONS=--experimental-vm-modules pnpm exec jest --runInBand --testPathPatterns='queue-telemetry|sources/infrastructure/queue|sources/application/services'`: 116 tests passed, including the real 1,001-job read boundary and paused inventory.
- Full backend suite via `pnpm exec jest --shard=N/3 --runInBand --silent --json`,
  `NODE_OPTIONS='--experimental-vm-modules --max-old-space-size=4096'`,
  `QUEUE_TELEMETRY_REDIS_PORT=32768`: 6,290 tests passed; two existing MinIO
  storage integration tests failed with `getaddrinfo ENOTFOUND minio`. CI's
  provisioned MinIO remains the full-suite gate. No infrastructure repair was attempted.
