import { randomUUID, UUID } from 'crypto';
import { ModelProvider } from '../../models/domain/value-objects/model-provider.enum';
import { Currency } from '../../models/domain/value-objects/currency.enum';

export class Usage {
  public readonly id: UUID;
  public readonly userId: UUID;
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
  public readonly cost?: number;
  public readonly currency?: Currency;
  public readonly requestId: UUID;
  public readonly createdAt: Date;

  constructor(params: {
    id?: UUID;
    userId: UUID;
    organizationId: UUID;
    modelId: UUID;
    provider: ModelProvider;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost?: number;
    currency?: Currency;
    requestId: UUID;
    createdAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.userId = params.userId;
    this.organizationId = params.organizationId;
    this.modelId = params.modelId;
    this.provider = params.provider;
    this.inputTokens = params.inputTokens;
    this.outputTokens = params.outputTokens;
    this.totalTokens = params.totalTokens;
    this.cost = params.cost;
    this.currency = params.currency;
    this.requestId = params.requestId;
    this.createdAt = params.createdAt ?? new Date();
  }
}
