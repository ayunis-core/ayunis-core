import { ModelProvider } from '../value-objects/model-provider.enum';
import { Model } from '../model.entity';
import { ModelType } from '../value-objects/model-type.enum';
import { UUID } from 'crypto';

export class EmbeddingModel extends Model {
  public readonly dimensions: number;

  constructor(params: {
    id?: UUID;
    name: string;
    provider: ModelProvider;
    createdAt?: Date;
    updatedAt?: Date;
    displayName: string;
    isArchived: boolean;
    dimensions: number;
  }) {
    super({ ...params, type: ModelType.EMBEDDING });
    this.dimensions = params.dimensions;
  }
}
