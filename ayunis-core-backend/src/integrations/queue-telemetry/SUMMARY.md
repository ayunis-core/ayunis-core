# Queue telemetry

Samples document-processing, data-source-processing, and url-crawl every 30 seconds
when AppSignal is active. Global Redis inventory is emitted as gauges tagged only
by queue. Replicas may repeat these read-only, idempotent samples; event counters
are emitted only by the executing consumer. Local overlap is skipped.

Oldest waiting age uses original creation time, including prior attempts/backoff.
Normal Redis commands read waiting/paused IDs and timestamps in batches of 100,
with at most 100 timestamp reads in flight. No Lua script or transaction holds
Redis across the whole backlog. Reads never hydrate job payloads; client memory
is O(100), and scan work is bounded by each list's initial length.

This is a best-effort sample: concurrent dequeues can shift pagination and hide
an older job until a later sample. Removed jobs are ignored, Redis read errors
fail the sample, and the next 30-second tick resamples current inventory. This
accuracy tradeoff keeps workers moving during a backlog. Total read work still
grows with queue depth and is repeated per replica. State counts and age may
differ during transitions.

See docs/runbooks/bullmq-metrics.md for metric definitions and operator response.
