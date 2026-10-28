# BullMQ AppSignal monitoring

The backend exports telemetry when the existing AppSignal client is active.
No SSH connection is used by the feature. Development remains excluded by
`appsignal.cjs`. The queue sampler runs every 30 seconds independently of Bull
Board and consumer execution.

## Dashboards and alerts

AppSignal application: `ayunis-core`.

| Environment | App ID                     | BullMQ dashboard ID        |
| ----------- | -------------------------- | -------------------------- |
| Staging     | `6a8038c73ebc17489e0e97f7` | `6acf4c2394be0fc4b93fb43f` |
| Production  | `6a611f0dd841ff7c22841fb2` | `6acf4c75e0715e61890a3551` |

Open **Metric dashboards → BullMQ queue health** in the selected environment.
The five chart definitions are in `appsignal-bullmq-dashboard.json` beside this
runbook. The `queue` dimension distinguishes `document-processing`,
`data-source-processing`, and `url-crawl`.

Nine Advanced triggers are configured per environment: each queue has these
three rules. Missing data is not treated as zero; a missing chart is a telemetry
gap, not evidence that the queue is empty.

| Metric / field                              | Condition    | Warmup    | Cooldown  |
| ------------------------------------------- | ------------ | --------- | --------- |
| `bullmq_jobs_waiting` / gauge               | >10 jobs     | 3 minutes | 3 minutes |
| `bullmq_oldest_waiting_age_seconds` / gauge | >600 seconds | 1 minute  | 3 minutes |
| `bullmq_queue_wait_seconds` / p95           | >600 seconds | 1 minute  | 3 minutes |

These are initial operator thresholds, not calibrated throughput guarantees.
The current stale-processing cleanup timeout in
`stale-processing-cleanup.task.ts` is 15 minutes, checked every 5 minutes.
The 10-minute age warning leaves time to intervene; queue depth gives an earlier
capacity signal. The age gauge alerts even when no job starts, whereas the
distribution needs processed attempts. Active document jobs renew heartbeats;
the stale timeout is not a hard per-job cancellation deadline.

Production triggers use **Default email notifier** and **Slack #ayunis-core-alerts**.
Staging currently exposes only the default email notifier;
AppSignal ignored the unavailable production Slack notifier ID when creating
staging triggers. Enable the existing Slack integration for staging before
claiming staging Slack delivery is verified.

Inspect settings without changing them:

```sh
appsignal-cli triggers list --app ayunis-core --environment staging --output json
appsignal-cli apps resources notifiers --app ayunis-core --environment staging
appsignal-cli dashboards show --app ayunis-core --environment staging --id 6acf4c2394be0fc4b93fb43f
```

## Metric and trace semantics

- `bullmq_jobs_{waiting,active,delayed,completed,failed}`: current Redis
  inventory. Completed/failed jobs have bounded retention (100/200); these are
  not cumulative throughput/failure totals. Waiting includes paused jobs.
- `bullmq_oldest_waiting_age_seconds`: original enqueue age of the oldest
  waiting/paused job, including previous processing attempts and retry backoff.
  Empty queues emit zero. Normal Redis reads examine at most 100 IDs/timestamps
  per batch, without a full-backlog Lua script or transaction. Gauges never
  include payloads. Concurrent dequeues can make one sample miss an older job;
  the next 30-second tick resamples inventory. This is a best-effort age signal,
  not a transactionally consistent snapshot. Read errors fail the sample.
- `bullmq_workers_registered`: workers registered with Redis for the queue.
  This includes busy or paused workers and is not the number of free execution
  slots. Compare active jobs and worker traces before concluding capacity is
  available.
- `bullmq_queue_wait_seconds`: original enqueue-to-current-attempt-start age.
  For a retry, this includes previous processing/backoff; it measures total
  upload delay rather than the latest backoff alone.
- `bullmq_processing_seconds`: elapsed consumer duration per attempt, including
  skipped jobs and failures. Neither duration changes processing timeouts.
- `bullmq_retry_count` and `bullmq_terminal_failure_count`: classified attempt
  outcomes, emitted by the executing consumer. Expected permanent failures count
  as terminal even when BullMQ records the job as completed to suppress error
  incidents. Errors before classification are counted without duplication.

Metric tags contain only the queue. Processed-job trace tags include queue,
one-based attempt, wait/processing seconds, UUID job ID, and UUID source ID or
upload ID. Upload ID links spreadsheet batches to their source IDs in protected
queue inspection. Filename, URL, user/org identity, storage paths, credentials,
document text, and raw error messages are not added by this instrumentation.

Document child spans are `document.download`, `document.extraction` (including
OCR), `document.splitting`, and `document.indexing`. Spreadsheet download and
extraction, URL crawl download/extraction, splitting, and indexing also have
stage spans. They preserve the active BullMQ parent context and mark errors
without recording payloads or exception contents. AppSignal's existing BullMQ
instrumentation owns the job root span.

## Operator response

1. Confirm the AppSignal environment and whether all queue charts have recent
   samples. Inspect waiting depth/age, active jobs, workers, retries, and terminal
   failures together. A full queue with zero registered workers is different
   from a busy queue whose workers are all processing slow OCR requests.
2. Open **Super Admin → Operations → Queue inspection**, following
   [the protected inspection runbook](bullmq-queue-inspection.md). Find the source
   UUID/job UUID or spreadsheet upload UUID; inspect timestamps and attempts.
3. Find the processed job in AppSignal background performance samples, correlate
   identifiers/attempt, and inspect child stages. For unstarted jobs, use waiting
   age and Bull Board; no processing trace exists yet.
4. Check provider incidents and the relevant host's capacity before deciding
   whether to adjust concurrency or resource limits. Escalate persistent backlog
   before waiting age reaches the stale timeout. Bull Board remains read-only;
   retry, deletion, pause, and worker restart require the existing reviewed
   operational procedure.
5. Confirm waiting age/depth recover and alerts close. Keep the terminal-failure
   counter separate from the retained failed-job inventory during diagnosis.

## Validation and controlled staging alert test

After the containing revision is deployed to **staging**, create isolated test
uploads through the deployed app and cover queued, active, successful, retried,
and terminally failed states. Verify all three queues, UUID correlation,
one-based attempts, stage parentage, and absence of sensitive payload fields in
the emitted trace tags and custom metrics.

For delivery, temporarily lower one **staging-only** backlog threshold to >0
with a 1-minute warmup while an isolated waiting test upload exists. Record the
prior complete trigger definition, update through `appsignal-cli triggers update`,
verify the AppSignal incident and actual notification receipt, then restore the
original >10 / 3-minute warmup / 3-minute cooldown configuration. Do not alter
production thresholds for this test or pause production queues. Confirm the
trigger closes after recovery and retain evidence of email and Slack receipt.

Local Redis integration tests prove inventory transitions and privacy of custom
outputs; they do not prove staging ingestion or notification delivery. Those
checks remain pending until the revision runs in staging and its Slack notifier
is available.

```sh
# Use a dedicated test Redis instance; CI provides one automatically.
QUEUE_TELEMETRY_REDIS_PORT=<test-redis-port> NODE_OPTIONS=--experimental-vm-modules \
  pnpm --dir ayunis-core-backend exec jest --runInBand --testPathPatterns=queue-telemetry
```
