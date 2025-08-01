import { ModelProvider } from '../value-objects/model-provider.enum';
import { Model } from '../model.entity';
import { ModelType } from '../value-objects/model-type.enum';
import { UUID } from 'crypto';

export class LanguageModel extends Model {
  public readonly canStream: boolean;
  public readonly isReasoning: boolean;

  constructor(params: {
    id?: UUID;
    name: string;
    provider: ModelProvider;
    createdAt?: Date;
    updatedAt?: Date;
    displayName: string;
    canStream: boolean;
    isReasoning: boolean;
    isArchived: boolean;
  }) {
    super({ ...params, type: ModelType.LANGUAGE });
    this.canStream = params.canStream;
    this.isReasoning = params.isReasoning;
  }
}
