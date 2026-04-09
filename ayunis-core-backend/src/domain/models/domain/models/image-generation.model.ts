import type { UUID } from 'crypto';
import type { ModelProvider } from '../value-objects/model-provider.enum';
import { Model } from '../model.entity';
import { ModelType } from '../value-objects/model-type.enum';

export class ImageGenerationModel extends Model {
  constructor(params: {
    id?: UUID;
    name: string;
    provider: ModelProvider;
    createdAt?: Date;
    updatedAt?: Date;
    displayName: string;
    isArchived: boolean;
  }) {
    super({ ...params, type: ModelType.IMAGE_GENERATION });
  }
}
