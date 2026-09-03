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
import { FindOrgByIdUseCase } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.use-case';
import { FindOrgByIdQuery } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.query';
import type { User } from 'src/iam/users/domain/user.entity';
import { SendWebhookUseCase } from 'src/integrations/webhooks/application/use-cases/send-webhook/send-webhook.use-case';
import { SendWebhookCommand } from 'src/integrations/webhooks/application/use-cases/send-webhook/send-webhook.command';
import { UserCreatedWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/user-created.webhook-event';
import { UserUpdatedWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/user-updated.webhook-event';
import { UserDeletedWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/user-deleted.webhook-event';
import { OrgCreatedWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/org-created.webhook-event';
import { SubscriptionCreatedWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/subscription-created.webhook-events';
import { SubscriptionCancelledWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/subscription-cancelled.webhook-event';
import { SubscriptionUncancelledWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/subscription-uncancelled.webhook-event';
import { SubscriptionSeatsUpdatedWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/subscription-seats-updated.webhook-event';
import { SubscriptionBillingInfoUpdatedWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/subscription-billing-info-updated.webhook-event';
import { UsageCollectedWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/usage-collected.webhook-event';
import { ChatSentWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/chat-sent.webhook-event';
import { AddonActivatedWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/addon-activated.webhook-event';
import { AddonDeactivatedWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/addon-deactivated.webhook-event';
import { mapSubscriptionToWebhookPayload } from './subscription-payload.mapper';
import { mapBillingInfoToWebhookPayload } from './billing-info-payload.mapper';
import type { WebhookEvent } from 'src/integrations/webhooks/domain/webhook-event.entity';
import { SkillUsedEvent } from 'src/domain/skills/application/events/skill-used.event';
import { ToolUsedEvent } from 'src/domain/runs/application/events/tool-used.event';
import { MarketplaceSkillInstalledEvent } from 'src/domain/skills/application/events/marketplace-skill-installed.event';
import { MarketplaceIntegrationInstalledEvent } from 'src/domain/mcp/application/events/marketplace-integration-installed.event';
import { SkillUsedWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/skill-used.webhook-event';
import { SkillInstalledWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/skill-installed.webhook-event';
import { IntegrationUsedWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/integration-used.webhook-event';
import { IntegrationInstalledWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/integration-installed.webhook-event';

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
    private readonly findOrgByIdUseCase: FindOrgByIdUseCase,
    private readonly configService: ConfigService,
  ) {}

  @OnEvent(UserCreatedEvent.EVENT_NAME)
  async handleUserCreated(event: UserCreatedEvent): Promise<void> {
    // Enrich with the org name (AYC-445, consumed by the Brevo
    // onboarding sink). Skipped when no webhook receiver is configured.
    const orgName = this.webhookConfigured()
      ? await this.resolveOrgName(event.orgId)
      : undefined;
    await this.dispatch(
      new UserCreatedWebhookEvent({
        user: event.user,
        orgId: event.orgId,
        orgName,
      }),
    );
  }

  @OnEvent(UserUpdatedEvent.EVENT_NAME)
  async handleUserUpdated(event: UserUpdatedEvent): Promise<void> {
    await this.dispatch(new UserUpdatedWebhookEvent(event.user));
  }

  @OnEvent(UserDeletedEvent.EVENT_NAME)
  async handleUserDeleted(event: UserDeletedEvent): Promise<void> {
    await this.dispatch(
      new UserDeletedWebhookEvent({
        id: event.userId,
        email: event.email,
        orgId: event.orgId,
      }),
    );
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

  @OnEvent(SkillUsedEvent.EVENT_NAME)
  async handleSkillUsed(event: SkillUsedEvent): Promise<void> {
    const user = await this.resolveWebhookUser(event.userId);
    if (!user) return;

    await this.dispatch(
      new SkillUsedWebhookEvent({
        ...event,
        userEmail: user.email,
        userName: user.name,
      }),
    );
  }

  @OnEvent(MarketplaceSkillInstalledEvent.EVENT_NAME)
  async handleMarketplaceSkillInstalled(
    event: MarketplaceSkillInstalledEvent,
  ): Promise<void> {
    const user = await this.resolveWebhookUser(event.userId);
    if (!user) return;

    await this.dispatch(
      new SkillInstalledWebhookEvent({
        ...event,
        userEmail: user.email,
        userName: user.name,
      }),
    );
  }

  @OnEvent(ToolUsedEvent.EVENT_NAME)
  async handleToolUsed(event: ToolUsedEvent): Promise<void> {
    if (!event.integrationId || !event.integrationName) return;
    const user = await this.resolveWebhookUser(event.userId);
    if (!user) return;

    await this.dispatch(
      new IntegrationUsedWebhookEvent({
        userId: event.userId,
        orgId: event.orgId,
        integrationId: event.integrationId,
        integrationName: event.integrationName,
        userEmail: user.email,
        userName: user.name,
      }),
    );
  }

  @OnEvent(MarketplaceIntegrationInstalledEvent.EVENT_NAME)
  async handleMarketplaceIntegrationInstalled(
    event: MarketplaceIntegrationInstalledEvent,
  ): Promise<void> {
    const user = await this.resolveWebhookUser(event.userId);
    if (!user) return;

    await this.dispatch(
      new IntegrationInstalledWebhookEvent({
        ...event,
        userEmail: user.email,
        userName: user.name,
      }),
    );
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

  private async resolveWebhookUser(userId: UUID): Promise<User | null> {
    return this.webhookConfigured() ? this.resolveUser(userId) : null;
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
      this.logger.error(
        {
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to resolve user for webhook enrichment',
      );
      return null;
    }
  }

  /**
   * Best-effort org-name lookup for payload enrichment. Returns
   * undefined instead of throwing so a failed lookup degrades to an
   * un-enriched event, never a dropped webhook.
   */
  private async resolveOrgName(orgId: UUID): Promise<string | undefined> {
    try {
      const org = await this.findOrgByIdUseCase.execute(
        new FindOrgByIdQuery(orgId),
      );
      return org.name;
    } catch (error) {
      this.logger.error(
        {
          orgId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to resolve org for webhook enrichment',
      );
      return undefined;
    }
  }

  private async dispatch(webhookEvent: WebhookEvent): Promise<void> {
    try {
      await this.sendWebhookUseCase.execute(
        new SendWebhookCommand(webhookEvent),
      );
    } catch (error) {
      this.logger.error(
        {
          eventType: webhookEvent.eventType,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Webhook dispatch failed',
      );
    }
  }
}
