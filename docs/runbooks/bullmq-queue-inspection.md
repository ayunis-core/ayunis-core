# BullMQ queue inspection

Use the protected Bull Board dashboard to inspect the live source-processing
queues during an incident. The dashboard is read-only and is linked from the
Super Admin navigation for authorized operators.

## Access

1. Sign in to the production Ayunis Core application with an explicitly
   authorized `SUPER_ADMIN` operator account.
2. In Super Admin, select **Operations → Queue inspection**. The dashboard
   opens in a new tab. Its direct URL is
   `https://<production-host>/api/internal/queues/`.
3. If the dashboard returns `401`, sign in again so the browser has a current
   access-token cookie. A `403` means either the account lacks the required
   system role or the request does not satisfy the organization's IP allowlist.
   Verify the operator account and network path; do not promote an account or
   bypass the allowlist solely to gain access.

Ordinary users and organization admins cannot access the dashboard. Access is
authenticated through the normal Ayunis Core session cookie and restricted to
the `SUPER_ADMIN` system role. The operator's email must be verified, and the
request must satisfy the operator organization's configured IP allowlist.

## Incident inspection

1. Select `document-processing`, `data-source-processing`, or `url-crawl`.
2. Check the `waiting`, `active`, `delayed`, `completed`, and `failed` tabs and
   record the relevant job ID and queue name.
3. Open a job and compare:
   - `timestamp`: when BullMQ accepted the job;
   - `processedOn`: when a worker started it;
   - `finishedOn`: when it completed or failed;
   - attempts, progress, failure reason, and stack trace.
4. Use the displayed `sourceId`, or the `uploadId` and `sourceIds` for a
   spreadsheet batch, to correlate the job with application logs and AppSignal.
5. Record observations in the incident timeline. Failure details retain error
   context after payload-derived values are redacted; keep screenshots and
   copied traces in approved incident channels.

The dashboard never receives document contents, file names, storage paths,
URLs, credentials, user or organization IDs, or job return values. Payloads are
reduced to the operational identifiers listed above.

## Read-only boundary

Bull Board's server-side read-only mode is mandatory for all three queues.
Retry, deletion, promotion, pause/resume, clean, add/edit, scheduler changes,
and other mutating queue or job operations are disabled. Direct calls to a
queue-specific mutating endpoint return `405 Method Not Allowed`.

Do not work around this boundary with Redis commands or application code during
an incident. Any future mutation path requires a separately reviewed design
with explicit elevated authorization, audit logging, and rollback guidance.
