BullMQ Queue Inspection

The queue-inspection integration mounts a Bull Board dashboard at
`/api/internal/queues`. It registers the `document-processing`,
`data-source-processing`, and `url-crawl` BullMQ queues and exposes their live
waiting, active, delayed, completed, and failed jobs.

Every request is authenticated with a verified-email Ayunis Core access-token
cookie, authorized against the `SUPER_ADMIN` system role, and checked against
the operator organization's IP allowlist. Authorized operators can open the
route from **Operations → Queue inspection** in the Super Admin navigation. The
queue adapter always enables Bull Board's server-enforced read-only mode, so
retry, deletion, promotion, pause, clean, job creation/editing, scheduler
changes, and other mutations are rejected.

Job data is projected to operational identifiers only. Document and URL jobs
show `sourceId`; spreadsheet jobs show `uploadId` and their `sourceIds`.
File names, paths, URLs, user and organization identifiers, credentials, full
payloads, and return values are never passed to Bull Board. Payload-derived
values are also removed from failure reasons, stack traces, and job logs while
the remaining error context, timestamps, attempts, and progress remain
available for incident diagnosis.

See `docs/runbooks/bullmq-queue-inspection.md` for production access and the
incident workflow.
