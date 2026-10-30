import { SubscriptionCreatedEvent } from 'src/iam/subscriptions/application/events/subscription-created.event';
import { SubscriptionCreatedWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/subscription-created.webhook-events';
import { SubscriptionCancelledEvent } from 'src/iam/subscriptions/application/events/subscription-cancelled.event';
import { SubscriptionCancelledWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/subscription-cancelled.webhook-event';
import { SubscriptionUncancelledEvent } from 'src/iam/subscriptions/application/events/subscription-uncancelled.event';
import { SubscriptionUncancelledWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/subscription-uncancelled.webhook-event';
import { SubscriptionSeatsUpdatedEvent } from 'src/iam/subscriptions/application/events/subscription-seats-updated.event';
import { SubscriptionSeatsUpdatedWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/subscription-seats-updated.webhook-event';
import { SubscriptionMonthlyCreditsUpdatedEvent } from 'src/iam/subscriptions/application/events/subscription-monthly-credits-updated.event';
import { SubscriptionMonthlyCreditsUpdatedWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/subscription-monthly-credits-updated.webhook-event';
import { SubscriptionBillingInfoUpdatedEvent } from 'src/iam/subscriptions/application/events/subscription-billing-info-updated.event';
import { SubscriptionBillingInfoUpdatedWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/subscription-billing-info-updated.webhook-event';
import { AddonActivatedEvent } from 'src/iam/addons/application/events/addon-activated.event';
import { AddonActivatedWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/addon-activated.webhook-event';
import { AddonDeactivatedEvent } from 'src/iam/addons/application/events/addon-deactivated.event';
import { AddonDeactivatedWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/addon-deactivated.webhook-event';
import type { PendingDomainEvent } from 'src/common/events/pending-domain-event';
import type { AnyWebhookEvent } from 'src/integrations/webhooks/domain/webhook-event.entity';
import { mapSubscriptionToWebhookPayload } from './subscription-payload.mapper';
import { mapBillingInfoToWebhookPayload } from './billing-info-payload.mapper';

export function mapBillingEvent(pending: PendingDomainEvent): AnyWebhookEvent {
  switch (pending.name) {
    case SubscriptionCreatedEvent.EVENT_NAME:
      return new SubscriptionCreatedWebhookEvent(
        mapSubscriptionToWebhookPayload(
          (pending.event as SubscriptionCreatedEvent).payload,
        ),
      );
    case SubscriptionCancelledEvent.EVENT_NAME:
      return new SubscriptionCancelledWebhookEvent(
        mapSubscriptionToWebhookPayload(
          (pending.event as SubscriptionCancelledEvent).payload,
        ),
      );
    case SubscriptionUncancelledEvent.EVENT_NAME:
      return new SubscriptionUncancelledWebhookEvent(
        mapSubscriptionToWebhookPayload(
          (pending.event as SubscriptionUncancelledEvent).payload,
        ),
      );
    case SubscriptionSeatsUpdatedEvent.EVENT_NAME:
      return new SubscriptionSeatsUpdatedWebhookEvent(
        mapSubscriptionToWebhookPayload(
          (pending.event as SubscriptionSeatsUpdatedEvent).payload,
        ),
      );
    case SubscriptionMonthlyCreditsUpdatedEvent.EVENT_NAME:
      return new SubscriptionMonthlyCreditsUpdatedWebhookEvent(
        mapSubscriptionToWebhookPayload(
          (pending.event as SubscriptionMonthlyCreditsUpdatedEvent).payload,
        ),
      );
    case SubscriptionBillingInfoUpdatedEvent.EVENT_NAME:
      return new SubscriptionBillingInfoUpdatedWebhookEvent(
        mapBillingInfoToWebhookPayload(
          (pending.event as SubscriptionBillingInfoUpdatedEvent).payload,
        ),
      );
    case AddonActivatedEvent.EVENT_NAME:
      return new AddonActivatedWebhookEvent(
        pending.event as AddonActivatedEvent,
      );
    case AddonDeactivatedEvent.EVENT_NAME:
      return new AddonDeactivatedWebhookEvent(
        pending.event as AddonDeactivatedEvent,
      );
    default:
      throw new Error('Unsupported billing event');
  }
}
