Event Webhooks
Deliver lifecycle webhook events to external systems via HTTP.

The webhooks module dispatches domain lifecycle events (user created/updated/deleted, org created, subscription changes) to a configured external URL. Webhook dispatch is triggered by `WebhookDispatchListener`, which subscribes to domain events emitted by use cases — no domain or IAM code imports from this module directly.

**Key files:**

- `webhooks.module.ts` — NestJS module wiring. Registers `SendWebhookUseCase`, `WebhookHandler` port/adapter binding, and `WebhookDispatchListener`. All providers are internal to the module.
- `listeners/webhook-dispatch.listener.ts` — Central listener that subscribes to domain events (`UserCreatedEvent`, `UserUpdatedEvent`, `UserDeletedEvent`, `OrgCreatedEvent`, subscription events) and dispatches them as webhook HTTP calls via `SendWebhookUseCase`.
- `application/use-cases/send-webhook/send-webhook.use-case.ts` — Receives a `SendWebhookCommand` and delegates to the `WebhookHandler` port.
- `application/ports/webhook.handler.ts` — Abstract port defining the webhook delivery contract.
- `infrastructure/http/http-webhook.handler.ts` — Infrastructure adapter that performs the actual HTTP POST to the configured webhook URL.
- `domain/entities/webhook-event.entity.ts` — Abstract `WebhookEvent` entity with UUID, event type enum, data payload, and timestamp. Nine concrete event types cover organization, user, and subscription lifecycle events.

**Architecture:**

Use cases emit domain events → `WebhookDispatchListener` handles them → constructs `WebhookEvent` subclasses → calls `SendWebhookUseCase` → `HttpWebhookHandler` delivers via HTTP POST. This decouples business logic from webhook infrastructure. Domain and IAM modules have no dependency on webhook code.

**Error handling:** Delivery failures are logged as warnings but never re-thrown, ensuring webhook issues cannot disrupt core business operations.
