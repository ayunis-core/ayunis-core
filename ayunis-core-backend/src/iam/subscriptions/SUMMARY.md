Subscription Billing
Manages organization subscriptions, billing info, seats, and cancellations.

Handles the complete subscription lifecycle for organizations including creation, seat management, billing information, pricing, cancellation, and reactivation. Supports monthly and yearly renewal cycles with per-seat pricing.

This module manages commercial access to Ayunis. Key entities are `Subscription` (org-scoped, with seat count, per-seat price, renewal cycle, cancellation status, and cycle anchor date) and `SubscriptionBillingInfo` (company name, address, VAT number). The `RenewalCycle` enum supports monthly and yearly billing. Main use cases include `CreateSubscriptionUseCase`, `CancelSubscriptionUseCase`, `UncancelSubscriptionUseCase` (reactivation before period ends), `UpdateSeatsUseCase` (adjust licensed user count), `UpdateBillingInfoUseCase`, `GetActiveSubscriptionUseCase`, `HasActiveSubscriptionUseCase`, `GetCurrentPriceUseCase`, and `GetMonthlyCreditLimitUseCase` (returns the monthly credit limit for an organization's usage-based subscription, or `null` if no limit applies). Error classes include `CreditBudgetExceededError` (used by the runs module's `CreditBudgetGuardService` when the limit is exceeded). Utility functions handle cycle date calculation and active-status determination.

### Domain Events

- **SubscriptionCreatedEvent** (`subscription.created`) — Emitted when a subscription is created. Carries orgId and SubscriptionEventData payload.
- **SubscriptionCancelledEvent** (`subscription.cancelled`) — Emitted when a subscription is cancelled. Carries orgId and SubscriptionEventData payload.
- **SubscriptionUncancelledEvent** (`subscription.uncancelled`) — Emitted when a subscription cancellation is reversed. Carries orgId and SubscriptionEventData payload.
- **SubscriptionSeatsUpdatedEvent** (`subscription.seats-updated`) — Emitted when the seat count is updated. Carries orgId and SeatBasedSubscriptionEventData payload.
- **SubscriptionBillingInfoUpdatedEvent** (`subscription.billing-info-updated`) — Emitted when billing info is updated. Carries orgId and BillingInfoEventData payload.

It integrates with **orgs** (each subscription belongs to one org), **authorization** via the `SubscriptionGuard` (gates features behind active subscriptions), **quotas** (subscription tier affects limits), and **trials** (organizations transition from trial to paid). The **runs** module consumes `GetMonthlyCreditLimitUseCase` to orchestrate credit budget checks. The HTTP layer includes both user-facing and super-admin controllers.
