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
Missing organization links or malformed entitlement values fail rather than silently choosing a default;
per AYC-1239 rule 4, a seat entitlement selects seat-based access and other unambiguous plans use usage-based access. Active subscriptions whose entitlements are still being provisioned produce a
retryable error. No active entitlements means no subscription once provisioning
is ruled out: item contract dates distinguish ended trial items from empty
entitlement lists during activation. Expired active trials do not count as
duplicates of their replacement subscription. Entitlement status is authoritative even when the source item
is already marked cancelled or a later product is scheduled.

The mapper's sanitized fixtures were captured with read-only requests against
Fynn Preview on 2026-10-20. They cover the parent ticket's cases 01–14 and 17–20; pending
period transitions are also tested with the next period's entitlement state.

`POST /internal/core-connect/fynn/subscriptions/:subscriptionId/sync` is excluded from public OpenAPI and requires the Connect service token. It accepts only an ID; billing values in request bodies are ignored. The cloud-only use case acquires the organization allocation lock before reloading Fynn state, checks all customers sharing the Core UUID for duplicate serving subscriptions, and atomically applies subscription, free-trial, and Academy state. Existing domain events publish after commit. Webhook receipt and periodic reconciliation are separate follow-ups.

The HTTP adapter validates response shapes and complete pagination, sends Bearer authentication, refuses redirects, times out requests, and uses shared provider failure classification. API and mapping failures preserve Core state.

Free-trial allowance is exhausted only when the synchronized Core subscription is actually active. Scheduling future paid access leaves the free trial available until that start date.

Sibling candidate selection validates entitlement readiness with the same mapper rules as the final snapshot; an Academy-only or ended-trial trigger cannot clear paid access while a sibling plan is provisioning.
