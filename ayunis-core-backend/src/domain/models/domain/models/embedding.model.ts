import { ModelProvider } from '../value-objects/model-provider.enum';
import { Model } from '../model.entity';
import { ModelType } from '../value-objects/model-type.enum';
import { UUID } from 'crypto';
import { EmbeddingDimensions } from '../value-objects/embedding-dimensions.enum';

export class EmbeddingModel extends Model {
  public readonly dimensions: EmbeddingDimensions;

  constructor(params: {
    id?: UUID;
    name: string;
    provider: ModelProvider;
    createdAt?: Date;
    updatedAt?: Date;
    displayName: string;
    isArchived: boolean;
    dimensions: EmbeddingDimensions;
  }) {
    super({ ...params, type: ModelType.EMBEDDING });
    this.dimensions = params.dimensions;
  }
}
