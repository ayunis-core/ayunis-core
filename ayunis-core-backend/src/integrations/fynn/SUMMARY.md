Fynn Subscription Synchronization
Maps Fynn's commercial subscription state into Core's access model.

The application mapper resolves the organization from the customer's
`ayunis-core-uuid` custom field. It sums active monthly and additional credit
entitlements, with subscription-level overrides replacing item values of the
same feature. Seat subscriptions read the quantity of the item carrying the
seat entitlement. Academy follows active `core-academy` entitlements.

Cancelled subscriptions retain access until their explicit cancellation date.
Terminated, voided, paused, draft, and offer subscriptions grant no access.
Missing or malformed mappings fail rather than silently choosing a default;
active subscriptions whose entitlements are still being provisioned produce a
retryable error. Entitlement status is authoritative even when the source item
is already marked cancelled or a later product is scheduled.

The mapper's sanitized fixtures were captured with read-only requests against
Fynn Preview on 2026-10-20. They cover the parent ticket's cases 01–14; pending
period transitions are also tested with the next period's entitlement state.
