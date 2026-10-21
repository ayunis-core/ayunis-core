Fynn Subscription Synchronization
Maps Fynn's commercial subscription state into Core's access model.

The application mapper resolves the organization from the customer's
`ayunis-core-uuid` custom field. It reads active `core-monthly-credits` entitlements, with subscription-level
overrides replacing item values. Archived `core-additional-credits` are ignored. Academy or a usage-type marker alone cannot retain paid access: access requires
active monthly credits or an active seat entitlement. Future-only pending plans
retry without clearing existing Core access; actual gaps after an ended item
remove access until the successor becomes active.
Seat subscriptions read the quantity of the item carrying the
seat entitlement. Academy follows active `core-academy` entitlements.

Cancelled subscriptions retain access until their explicit cancellation date.
Terminated, voided, paused, draft, and offer subscriptions grant no access.
Malformed organization UUIDs or entitlement values fail rather than silently choosing a default;
per AYC-1239 rule 4, a seat entitlement selects seat-based access and other unambiguous plans use usage-based access. Active subscriptions whose entitlements are still being provisioned produce a
retryable error. No active entitlements means no subscription once provisioning
is ruled out: item contract dates distinguish ended trial items from empty
entitlement lists during activation. Expired active trials do not count as
duplicates of their replacement subscription. Entitlement status is authoritative even when the source item
is already marked cancelled or a later product is scheduled.

The mapper's sanitized fixtures were captured with read-only requests against
Fynn Preview on 2026-10-20. They cover the parent ticket's cases 01–14 and 17–20; pending
period transitions are also tested with the next period's entitlement state.

`POST /internal/core-connect/fynn/subscriptions/:subscriptionId/sync` is excluded from public OpenAPI and requires the Connect service token. It accepts only an ID; billing values in request bodies are ignored. The cloud-only use case prepares Fynn state outside the organization allocation lock. A persisted per-org revision rejects superseded preparations before a short transaction applies subscription, free-trial, Academy and link state. Provider work has a shared 45-second deadline and individual requests time out after at most 10 seconds. Revision and allocation-lock statements have a five-second timeout. Duplicate serving subscriptions across customers remain an error. Internal domain effects execute inside the state transaction; outgoing billing events are persisted in the same transaction and delivered separately. Webhook receipt lives in Connect; the scheduled reconciliation task is described below.

The HTTP adapter validates response shapes and complete pagination, sends Bearer authentication, refuses redirects, cancels error response bodies, and uses shared provider failure classification. Entitlement status accepts the documented active, pending, disabled and expired states; unknown states preserve existing Core data by failing synchronization. A per-process queue limits provider reads to three per second, below the documented 240/minute entitlement limit. Provider 429 responses still fail for retry; the queue is not a cross-replica quota. API and mapping failures preserve Core state.

Free-trial allowance is exhausted only when the synchronized Core subscription is actually active. Scheduling future paid access leaves the free trial available until that start date.

Sibling candidate selection validates entitlement readiness with the same mapper rules as the final snapshot; an Academy-only or ended-trial trigger cannot clear paid access while a sibling plan is provisioning.

Reconciliation runs daily at 00:05 Europe/Berlin through the same locked sync.
A PostgreSQL session advisory lock limits the sweep to one replica; startup requires at least two pool connections when enabled and pool acquisition times out after ten seconds. per-org
failures are logged and do not stop other orgs, but fail the AppSignal cron
check-in. Unlinked customers and offers without subscriptions create no access. Previously synchronized links are checked for cleanup.
Both scheduled and webhook-triggered synchronization require the cloud Fynn
feature flag, so restoring manual management also stops incoming sync writes.
`POST /internal/core-connect/fynn/customers/:customerId/sync` handles customer
link changes by reloading their subscriptions. It uses the same service guard
and returns a retryable failure if any affected sync fails. Webhook delivery IDs
are logged without trusting webhook billing data.

Fynn owns `fynn_org_links`, a persisted customer-to-Core-org mapping saved in the
same transaction as a successful sync. Customer/subscription webhooks and the daily
sweep use these recorded links to revoke the old org’s paid subscription and
Academy access when its UUID is removed, moved, or its last Fynn subscription is
removed. The cleanup does not mutate Core free trials. Only previously tracked
orgs are eligible; existing manual orgs are not inferred from the source list.

Sweep discovery reuses a complete, execution-local customer index for the sweep, eliminating repeated full account reads and repeated linear scans. Cleanup freshly reads the tracked customer and each candidate owner before it can revoke access. Discovery is an execution-start index; newly created customers enter via their webhook or the next sweep. Fresh targeted reads, rather than cached fields, decide whether tracked access may be revoked. Each cleanup preparation has its own deadline, so large daily sweeps do not repeatedly starve later links. The transaction checks its revision and rereads recorded ownership under the allocation lock; another current customer with subscriptions preserves access. Provider errors and malformed nonempty UUIDs
preserve state and fail for retry. Link deletion, paid access and Academy changes
commit together with pending external events. Reconciliation processed/changed counters include successful cleanup operations as well as sync operations; processed is an operation count, not a unique-org count. Moving a link cleans
up the old org independently of whether the new org can synchronize successfully.

Durable outgoing billing work lives in `fynn_outbox`. Claims select only the oldest
pending event per organization, use a two-minute recovery lease and a unique claim
token, and fence completion/retry from stale workers. A five-second poll retries
failed deliveries after one minute. Delivery retains the same webhook ID and timestamp,
uses the existing bounded HTTP adapter, and never replays internal domain effects.
Delivery is at least once; receivers must deduplicate by event ID. Binary payloads
use Node's built-in V8 serialization to preserve domain Date values across retries.

`pnpm run test:fynn-lifecycle` runs the real-record PostgreSQL lifecycle suite in CI
on shard 1. Its dedicated compiler preserves production decorator metadata instead
of replacing records with simplified EntitySchema definitions. It covers service
principals, replay, plan transitions, expiration, provider failure, move/unlink/recreate,
rollback, durable retry, a separate flag-off boot and invitation replacement concurrency.
Real Fynn Preview delivery remains a rollout check until Connect has a public dev URL.

Provider contract sources: [entitlement status and rate limit](https://docs.fynn.eu/guide/entitlements/introduction)
and [webhook events](https://docs.fynn.eu/en/guide/webhooks/introduction).

A targeted customer 404 still runs tracked-link cleanup. A subscription whose customer returns 404 uses the customer ID from that subscription for cleanup. A missing subscription returns the internal resource-not-found 404. Connect uses a validated customer ID from the signed envelope, when present, to request canonical customer cleanup. Without a known customer association the delivery remains retryable; the daily complete discovery cleans tracked organizations without inferring ownership from a missing identifier.

Cleanup observes revisions without replacing them. A completed synchronization (including replay) or actual revocation rotates the revision within its transaction, so older prepared work cannot overwrite a committed winner. No-op cleanup leaves concurrent webhook preparation valid.

Unassignable subscription/customer triggers emit a structured `FYNN_ORG_LINK_MISSING` warning containing only resource and delivery IDs. Reconciliation checks whether an unlinked customer has subscriptions before warning, so accepted offers without subscriptions remain silent. Missing links still acknowledge after tracked cleanup, preserving intentional unlink and replay behavior. The provider acceptance checklist and offline readiness probe are documented in `docs/runbooks/fynn-preview-acceptance.md`.
