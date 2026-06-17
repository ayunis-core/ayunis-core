import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { ModelProvider } from '../../models/domain/value-objects/model-provider.enum';

export class Usage {
  public readonly id: UUID;
  public readonly userId: UUID | null;
  public readonly apiKeyId: UUID | null;
  public readonly organizationId: UUID;
  /**
   * The base model ID (not the permitted model ID).
   * This refers to the actual model entity (e.g., LanguageModel.id),
   * not the organization-specific PermittedModel.id.
   * To find the permitted model, join PermittedModelRecord using modelId + organizationId.
   */
  public readonly modelId: UUID;
  public readonly provider: ModelProvider;
  public readonly inputTokens: number;
  public readonly outputTokens: number;
  public readonly totalTokens: number;
  /** Cost in EUR */
  public readonly cost?: number;
  public readonly creditsConsumed?: number;
  public readonly requestId: UUID;
  public readonly createdAt: Date;

  constructor(params: {
    id?: UUID;
    userId: UUID | null;
    apiKeyId?: UUID | null;
    organizationId: UUID;
    modelId: UUID;
    provider: ModelProvider;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost?: number;
    creditsConsumed?: number;
    requestId: UUID;
    createdAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.userId = params.userId;
    this.apiKeyId = params.apiKeyId ?? null;
    this.organizationId = params.organizationId;
    this.modelId = params.modelId;
    this.provider = params.provider;
    this.inputTokens = params.inputTokens;
    this.outputTokens = params.outputTokens;
    this.totalTokens = params.totalTokens;
    this.cost = params.cost;
    this.creditsConsumed = params.creditsConsumed;
    this.requestId = params.requestId;
    this.createdAt = params.createdAt ?? new Date();
  }
}
