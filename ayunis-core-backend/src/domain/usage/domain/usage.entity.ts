import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { ModelProvider } from '../../models/domain/value-objects/model-provider.enum';

export class Usage {
  public readonly id: UUID;
  /**
   * The user who generated this usage. `null` when the call was authenticated
   * via an API key — in that case `apiKeyId` is set instead. On insert, exactly
   * one of `userId` / `apiKeyId` is populated (enforced in the constructor below).
   * After the referenced principal is deleted, the FK is set to NULL — so existing
   * rows may have both columns null.
   */
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
    apiKeyId: UUID | null;
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
    if (!params.userId && !params.apiKeyId) {
      throw new Error(
        'Usage row must have either userId or apiKeyId — both are null',
      );
    }
    if (params.userId && params.apiKeyId) {
      throw new Error(
        'Usage row must have exactly one principal — userId and apiKeyId are both set',
      );
    }
    this.id = params.id ?? randomUUID();
    this.userId = params.userId;
    this.apiKeyId = params.apiKeyId;
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
