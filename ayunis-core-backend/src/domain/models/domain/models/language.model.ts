import { ModelProvider } from '../value-objects/model-provider.enum';
import { Model } from '../model.entity';
import { ModelType } from '../value-objects/model-type.enum';
import { UUID } from 'crypto';

export class LanguageModel extends Model {
  public readonly canStream: boolean;
  public readonly canUseTools: boolean;
  public readonly isReasoning: boolean;
  public readonly canVision: boolean;
  public readonly inputTokenCost?: number;
  public readonly outputTokenCost?: number;
  public readonly currency?: string;

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
    currency?: string;
  }) {
    super({ ...params, type: ModelType.LANGUAGE });
    this.canStream = params.canStream;
    this.canUseTools = params.canUseTools;
    this.isReasoning = params.isReasoning;
    this.canVision = params.canVision;
    this.inputTokenCost = params.inputTokenCost;
    this.outputTokenCost = params.outputTokenCost;
    this.currency = params.currency;
  }
}
