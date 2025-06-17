import { UUID } from 'crypto';
import { PermittedModel } from '../../domain/permitted-model.entity';

export abstract class UserDefaultModelsRepository {
  abstract findByUserId(userId: UUID): Promise<PermittedModel | null>;
  abstract create(
    permittedModel: PermittedModel,
    userId: UUID,
  ): Promise<PermittedModel>;
  abstract update(
    permittedModel: PermittedModel,
    userId: UUID,
  ): Promise<PermittedModel>;
  abstract setAsDefault(
    permittedModel: PermittedModel,
    userId: UUID,
  ): Promise<PermittedModel>;
  abstract delete(permittedModel: PermittedModel, userId: UUID): Promise<void>;
}
