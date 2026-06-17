import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import type { UUID } from 'crypto';
import { UserCreatedEvent } from 'src/iam/users/application/events/user-created.event';
import { UserUpdatedEvent } from 'src/iam/users/application/events/user-updated.event';
import { UserDeletedEvent } from 'src/iam/users/application/events/user-deleted.event';
import { OrgCreatedEvent } from 'src/iam/orgs/application/events/org-created.event';
import { SubscriptionCreatedEvent } from 'src/iam/subscriptions/application/events/subscription-created.event';
import { SubscriptionCancelledEvent } from 'src/iam/subscriptions/application/events/subscription-cancelled.event';
import { SubscriptionUncancelledEvent } from 'src/iam/subscriptions/application/events/subscription-uncancelled.event';
import { SubscriptionSeatsUpdatedEvent } from 'src/iam/subscriptions/application/events/subscription-seats-updated.event';
import { SubscriptionBillingInfoUpdatedEvent } from 'src/iam/subscriptions/application/events/subscription-billing-info-updated.event';
import { UsageCollectedEvent } from 'src/domain/usage/application/events/usage-collected.event';
import { AddonActivatedEvent } from 'src/iam/addons/application/events/addon-activated.event';
import { AddonDeactivatedEvent } from 'src/iam/addons/application/events/addon-deactivated.event';
import { UserMessageCreatedEvent } from 'src/domain/messages/application/events/user-message-created.event';
import { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';
import { FindUserByIdQuery } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.query';
import type { User } from 'src/iam/users/domain/user.entity';
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
import { UsageCollectedWebhookEvent } from '../domain/webhook-events/usage-collected.webhook-event';
import { ChatSentWebhookEvent } from '../domain/webhook-events/chat-sent.webhook-event';
import { AddonActivatedWebhookEvent } from '../domain/webhook-events/addon-activated.webhook-event';
import { AddonDeactivatedWebhookEvent } from '../domain/webhook-events/addon-deactivated.webhook-event';
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

  constructor(
    private readonly sendWebhookUseCase: SendWebhookUseCase,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly configService: ConfigService,
  ) {}

  @OnEvent(UserCreatedEvent.EVENT_NAME)
  async handleUserCreated(event: UserCreatedEvent): Promise<void> {
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
    await this.dispatch(new OrgCreatedWebhookEvent(event.org));
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

  @OnEvent(UsageCollectedEvent.EVENT_NAME)
  async handleUsageCollected(event: UsageCollectedEvent): Promise<void> {
    // API-key usage has no user; the event is still dispatched unenriched —
    // receivers decide whether unattributed usage is relevant to them.
    const user =
      event.usage.userId && this.webhookConfigured()
        ? await this.resolveUser(event.usage.userId)
        : null;
    await this.dispatch(
      new UsageCollectedWebhookEvent(event.usage, event.modelName, user),
    );
  }

  @OnEvent(UserMessageCreatedEvent.EVENT_NAME)
  async handleUserMessageCreated(
    event: UserMessageCreatedEvent,
  ): Promise<void> {
    // Skip the per-message user lookup entirely when no webhook receiver is
    // configured — this handler fires for every chat message.
    if (!this.webhookConfigured()) {
      return;
    }
    const user = await this.resolveUser(event.userId);
    if (!user) {
      return;
    }
    await this.dispatch(new ChatSentWebhookEvent(event, user));
  }

  @OnEvent(AddonActivatedEvent.EVENT_NAME)
  async handleAddonActivated(event: AddonActivatedEvent): Promise<void> {
    await this.dispatch(
      new AddonActivatedWebhookEvent({
        orgId: event.orgId,
        addonType: event.addonType,
        actorUserId: event.actorUserId,
      }),
    );
  }

  @OnEvent(AddonDeactivatedEvent.EVENT_NAME)
  async handleAddonDeactivated(event: AddonDeactivatedEvent): Promise<void> {
    await this.dispatch(
      new AddonDeactivatedWebhookEvent({
        orgId: event.orgId,
        addonType: event.addonType,
        actorUserId: event.actorUserId,
      }),
    );
  }

  private webhookConfigured(): boolean {
    return !!this.configService.get<string>('app.orgEventsWebhookUrl');
  }

  /**
   * Best-effort user lookup for payload enrichment. Returns null instead of
   * throwing so a missing user (e.g. deleted in the same tick) degrades to a
   * skipped enrichment, never a crashed listener.
   */
  private async resolveUser(userId: UUID): Promise<User | null> {
    try {
      return await this.findUserByIdUseCase.execute(
        new FindUserByIdQuery(userId),
      );
    } catch (error) {
      this.logger.error('Failed to resolve user for webhook enrichment', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
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
