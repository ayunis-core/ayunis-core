import type { UUID } from 'crypto';
import type { Usage } from 'src/domain/usage/domain/usage.entity';
import type { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import type { User } from 'src/iam/users/domain/user.entity';
import { WebhookEvent } from '../webhook-event.entity';
import { WebhookEventType } from '../value-objects/webhook-event-type.enum';

export interface UsageCollectedWebhookPayload {
  id: UUID;
  userId: UUID | null;
  organizationId: UUID;
  modelId: UUID;
  modelName: string;
  provider: ModelProvider;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost?: number;
  creditsConsumed?: number;
  requestId: UUID;
  createdAt: string;
  /**
   * Present when the usage was triggered by a user (not an API key) and the
   * user could be resolved. Lets receivers lazily create the user in
   * external systems without calling back into Ayunis Core.
   */
  userEmail?: string;
  userName?: string;
}

export class UsageCollectedWebhookEvent extends WebhookEvent<UsageCollectedWebhookPayload> {
  readonly eventType: WebhookEventType;
  readonly data: UsageCollectedWebhookPayload;
  readonly timestamp: Date;

  constructor(usage: Usage, modelName: string, user?: User | null) {
    super();
    this.eventType = WebhookEventType.USAGE_COLLECTED;
    this.data = {
      id: usage.id,
      userId: usage.userId,
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
