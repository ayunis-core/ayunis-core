import type { ModelProvider } from '../value-objects/model-provider.enum';
import { Model } from '../model.entity';
import { ModelType } from '../value-objects/model-type.enum';
import type { UUID } from 'crypto';
import type { EmbeddingDimensions } from '../value-objects/embedding-dimensions.enum';
import type { Currency } from '../value-objects/currency.enum';

export class EmbeddingModel extends Model {
  public readonly dimensions: EmbeddingDimensions;
  public readonly inputTokenCost?: number;
  public readonly outputTokenCost?: number;
  public readonly currency?: Currency;

  constructor(params: {
    id?: UUID;
    name: string;
    provider: ModelProvider;
    createdAt?: Date;
    updatedAt?: Date;
    displayName: string;
    isArchived: boolean;
    dimensions: EmbeddingDimensions;
    inputTokenCost?: number;
    outputTokenCost?: number;
    currency?: Currency;
  }) {
    super({ ...params, type: ModelType.EMBEDDING });
    this.dimensions = params.dimensions;
    this.inputTokenCost = params.inputTokenCost;
    this.outputTokenCost = params.outputTokenCost;
    this.currency = params.currency;
  }
}
