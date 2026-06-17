import type { UUID } from 'crypto';
import type { ModelProvider } from '../value-objects/model-provider.enum';
import { Model } from '../model.entity';
import { ModelType } from '../value-objects/model-type.enum';

export class ImageGenerationModel extends Model {
  /** Cost per million input tokens in EUR */
  public readonly inputTokenCost?: number;
  /** Cost per million output tokens in EUR */
  public readonly outputTokenCost?: number;

  constructor(params: {
    id?: UUID;
    name: string;
    provider: ModelProvider;
    createdAt?: Date;
    updatedAt?: Date;
    displayName: string;
    isArchived: boolean;
    inputTokenCost?: number;
    outputTokenCost?: number;
  }) {
    super({ ...params, type: ModelType.IMAGE_GENERATION });
    this.inputTokenCost = params.inputTokenCost;
    this.outputTokenCost = params.outputTokenCost;
  }
}
