import type { UsageCollectedPayload as UsageCollectedWebhookPayload } from '@ayunis-core/connect-sdk/contracts';
import type { Usage } from 'src/domain/usage/domain/usage.entity';
import type { User } from 'src/iam/users/domain/user.entity';
import { WebhookEvent } from 'src/integrations/webhooks/domain/webhook-event.entity';
import { WebhookEventType } from 'src/integrations/webhooks/domain/value-objects/webhook-event-type.enum';

export type { UsageCollectedPayload as UsageCollectedWebhookPayload } from '@ayunis-core/connect-sdk/contracts';

export class UsageCollectedWebhookEvent extends WebhookEvent<
  typeof WebhookEventType.USAGE_COLLECTED
> {
  readonly eventType = WebhookEventType.USAGE_COLLECTED;
  readonly data: UsageCollectedWebhookPayload;
  readonly timestamp: Date;

  constructor(usage: Usage, modelName: string, user?: User | null) {
    super();
    this.data = {
      id: usage.id,
      userId: usage.userId,
      ...(usage.apiKeyId ? { apiKeyId: usage.apiKeyId } : {}),
      organizationId: usage.organizationId,
      modelId: usage.modelId,
      modelName,
      provider: usage.provider,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
      cost: usage.cost,
      creditsConsumed: usage.creditsConsumed,
      requestId: usage.requestId,
      createdAt: usage.createdAt.toISOString(),
      userEmail: user?.email,
      userName: user?.name,
    };
    this.timestamp = new Date();
  }
}
