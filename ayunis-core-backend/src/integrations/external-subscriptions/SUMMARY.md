External Subscription Synchronization
Apply provider-neutral commercial access snapshots from the authenticated Connect service.

Connect owns vendor credentials, webhook processing, canonical API reads, entitlement mapping, retries, customer-link discovery and five-minute reconciliation. Core does not call a billing provider. The internal controller is excluded from public Swagger; the offline internal artifact generates the SDK client consumed by Connect.

The service API prepares a per-organization revision before Connect reads provider state. Applying a normalized subscription, Academy flag and opaque external owner acquires the revision row and seat allocation lock before changing local state. A superseded revision returns 409 so the caller must read provider state again. Successful applications rotate the revision, including no-op replays. Cleanup observes without rotating and may revoke only its exact current owner. Core validates organization existence, dates, access model and allowances; provider event payloads never bypass these checks.

Subscription, free-trial, Academy, ownership and pending outbound events commit in one transaction. Only actually active subscriptions exhaust a free trial. Local listeners execute inside that transaction; outbound Core webhooks use the durable ordered outbox and bounded retry leases. External delivery failure cannot roll back committed local access or replay local effects.

Generic ownership/revision/outbox records retain their historical physical table names (`fynn_org_links`, `fynn_sync_revisions`, `fynn_outbox`) to preserve existing data. Names do not select a provider or encode its policy. Owner IDs are opaque to Core. The new `external_subscription_leases` table uses database time and worker tokens to coordinate reconciliation in Connect; expired workers cannot release a replacement worker's lease.

`FEATURE_EXTERNAL_SUBSCRIPTIONS_ENABLED` defaults off and is cloud-only. Disabled/self-hosted deployments reject prepare, apply and coordination requests. Committed outgoing work can still drain after disabling writes. Core requires only the Connect service credential; all provider credentials belong in Connect.

Validation includes strict HTTP DTO checks with independent user/service principals, real-record PostgreSQL lifecycle/rollback/lease tests, the actual generated SDK contract and public-schema exclusion checks. No UI or provider network is required by this module's tests.
