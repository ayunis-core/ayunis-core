import { UUID } from 'crypto';
import { PermittedLanguageModel } from '../../domain/permitted-model.entity';

export abstract class UserDefaultModelsRepository {
  abstract findByUserId(userId: UUID): Promise<PermittedLanguageModel | null>;
  abstract create(
    permittedModel: PermittedLanguageModel,
    userId: UUID,
  ): Promise<PermittedLanguageModel>;
  abstract update(
    permittedModel: PermittedLanguageModel,
    userId: UUID,
  ): Promise<PermittedLanguageModel>;
  abstract setAsDefault(
    permittedModel: PermittedLanguageModel,
    userId: UUID,
  ): Promise<PermittedLanguageModel>;
  abstract delete(
    permittedModel: PermittedLanguageModel,
    userId: UUID,
  ): Promise<void>;
  abstract deleteByModelId(modelId: UUID): Promise<void>;
}
