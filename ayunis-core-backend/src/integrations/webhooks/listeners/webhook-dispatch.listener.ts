import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserCreatedEvent } from 'src/iam/users/application/events/user-created.event';
import { UserUpdatedEvent } from 'src/iam/users/application/events/user-updated.event';
import { UserDeletedEvent } from 'src/iam/users/application/events/user-deleted.event';
import { OrgCreatedEvent } from 'src/iam/orgs/application/events/org-created.event';
import { SubscriptionCreatedEvent } from 'src/iam/subscriptions/application/events/subscription-created.event';
import { SubscriptionCancelledEvent } from 'src/iam/subscriptions/application/events/subscription-cancelled.event';
import { SubscriptionUncancelledEvent } from 'src/iam/subscriptions/application/events/subscription-uncancelled.event';
import { SubscriptionSeatsUpdatedEvent } from 'src/iam/subscriptions/application/events/subscription-seats-updated.event';
import { SubscriptionBillingInfoUpdatedEvent } from 'src/iam/subscriptions/application/events/subscription-billing-info-updated.event';
import { SendWebhookUseCase } from '../application/use-cases/send-webhook/send-webhook.use-case';
import { SendWebhookCommand } from '../application/use-cases/send-webhook/send-webhook.command';
import { UserCreatedWebhookEvent } from '../domain/webhook-events/user-created.webhook-event';
import { UserUpdatedWebhookEvent } from '../domain/webhook-events/user-updated.webhook-event';
import { UserDeletedWebhookEvent } from '../domain/webhook-events/user-deleted.webhook-event';
import { OrgCreatedWebhookEvent } from '../domain/webhook-events/org-created.webhook-event';
import { SubscriptionCreatedWebhookEvent } from '../domain/webhook-events/subscription-created.webhook-events';
import { SubscriptionCancelledWebhookEvent } from '../domain/webhook-events/subscription-cancelled.webhook-event';
import { SubscriptionUncancelledWebhookEvent } from '../domain/webhook-events/subscription-uncancelled.webhook-event';
import { SubscriptionSeatsUpdatedWebhookEvent } from '../domain/webhook-events/subscription-seats-updated.webhook-event';
import { SubscriptionBillingInfoUpdatedWebhookEvent } from '../domain/webhook-events/subscription-billing-info-updated.webhook-event';
import { mapSubscriptionToWebhookPayload } from './subscription-payload.mapper';
import { mapBillingInfoToWebhookPayload } from './billing-info-payload.mapper';
import type { WebhookEvent } from '../domain/webhook-event.entity';

/**
 * Subscribes to domain events that have corresponding webhook event types
 * and dispatches them via {@link SendWebhookUseCase}. Errors are caught
 * and logged — matching the existing fire-and-forget pattern.
 */
@Injectable()
export class WebhookDispatchListener {
  private readonly logger = new Logger(WebhookDispatchListener.name);

  constructor(private readonly sendWebhookUseCase: SendWebhookUseCase) {}

  @OnEvent(UserCreatedEvent.EVENT_NAME)
  async handleUserCreated(event: UserCreatedEvent): Promise<void> {
    if (!event.user) return;
    await this.dispatch(
      new UserCreatedWebhookEvent({ user: event.user, orgId: event.orgId }),
    );
  }

  @OnEvent(UserUpdatedEvent.EVENT_NAME)
  async handleUserUpdated(event: UserUpdatedEvent): Promise<void> {
    await this.dispatch(new UserUpdatedWebhookEvent(event.user));
  }

  @OnEvent(UserDeletedEvent.EVENT_NAME)
  async handleUserDeleted(event: UserDeletedEvent): Promise<void> {
    await this.dispatch(new UserDeletedWebhookEvent(event.userId));
  }

  @OnEvent(OrgCreatedEvent.EVENT_NAME)
  async handleOrgCreated(event: OrgCreatedEvent): Promise<void> {
    await this.dispatch(new OrgCreatedWebhookEvent(event.org, event.user));
  }

  @OnEvent(SubscriptionCreatedEvent.EVENT_NAME)
  async handleSubscriptionCreated(
    event: SubscriptionCreatedEvent,
  ): Promise<void> {
    await this.dispatch(
      new SubscriptionCreatedWebhookEvent(
        mapSubscriptionToWebhookPayload(event.payload),
      ),
    );
  }

  @OnEvent(SubscriptionCancelledEvent.EVENT_NAME)
  async handleSubscriptionCancelled(
    event: SubscriptionCancelledEvent,
  ): Promise<void> {
    await this.dispatch(
      new SubscriptionCancelledWebhookEvent(
        mapSubscriptionToWebhookPayload(event.payload),
      ),
    );
  }

  @OnEvent(SubscriptionUncancelledEvent.EVENT_NAME)
  async handleSubscriptionUncancelled(
    event: SubscriptionUncancelledEvent,
  ): Promise<void> {
    await this.dispatch(
      new SubscriptionUncancelledWebhookEvent(
        mapSubscriptionToWebhookPayload(event.payload),
      ),
    );
  }

  @OnEvent(SubscriptionSeatsUpdatedEvent.EVENT_NAME)
  async handleSubscriptionSeatsUpdated(
    event: SubscriptionSeatsUpdatedEvent,
  ): Promise<void> {
    await this.dispatch(
      new SubscriptionSeatsUpdatedWebhookEvent(
        mapSubscriptionToWebhookPayload(event.payload),
      ),
    );
  }

  @OnEvent(SubscriptionBillingInfoUpdatedEvent.EVENT_NAME)
  async handleSubscriptionBillingInfoUpdated(
    event: SubscriptionBillingInfoUpdatedEvent,
  ): Promise<void> {
    await this.dispatch(
      new SubscriptionBillingInfoUpdatedWebhookEvent(
        mapBillingInfoToWebhookPayload(event.payload),
      ),
    );
  }

  private async dispatch(webhookEvent: WebhookEvent): Promise<void> {
    try {
      await this.sendWebhookUseCase.execute(
        new SendWebhookCommand(webhookEvent),
      );
    } catch (error) {
      this.logger.error('Webhook dispatch failed', {
        eventType: webhookEvent.eventType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
