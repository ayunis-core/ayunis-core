import type { ModelProvider } from '../value-objects/model-provider.enum';
import { Model } from '../model.entity';
import { ModelType } from '../value-objects/model-type.enum';
import type { ModelTier } from '../value-objects/model-tier.enum';
import type { UUID } from 'crypto';

export class LanguageModel extends Model {
  public readonly canStream: boolean;
  public readonly canUseTools: boolean;
  public readonly isReasoning: boolean;
  public readonly canVision: boolean;
  /** Cost per million input tokens in EUR */
  public readonly inputTokenCost?: number;
  /** Cost per million output tokens in EUR */
  public readonly outputTokenCost?: number;
  /**
   * Fair-use tier label assigned by super admins. Drives quota bucket
   * selection. Optional today; runtime fallback for untiered models is
   * tracked in AYC-109.
   */
  public readonly tier?: ModelTier;

  constructor(params: {
    id?: UUID;
    name: string;
    provider: ModelProvider;
    createdAt?: Date;
    updatedAt?: Date;
    displayName: string;
    canStream: boolean;
    canUseTools: boolean;
    isReasoning: boolean;
    canVision: boolean;
    isArchived: boolean;
    inputTokenCost?: number;
    outputTokenCost?: number;
    tier?: ModelTier;
  }) {
    super({ ...params, type: ModelType.LANGUAGE });
    this.canStream = params.canStream;
    this.canUseTools = params.canUseTools;
    this.isReasoning = params.isReasoning;
    this.canVision = params.canVision;
    this.inputTokenCost = params.inputTokenCost;
    this.outputTokenCost = params.outputTokenCost;
    this.tier = params.tier;
  }
}
