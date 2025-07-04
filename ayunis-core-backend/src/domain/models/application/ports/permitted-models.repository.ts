import { UUID } from 'crypto';
import { PermittedModel } from '../../domain/permitted-model.entity';
import { ModelProvider } from '../../domain/value-objects/model-provider.enum';

export type FindOneParams =
  | {
      id: UUID;
      orgId: UUID;
    }
  | {
      name: string;
      provider: ModelProvider;
      orgId: UUID;
    };

export abstract class PermittedModelsRepository {
  abstract findAll(orgId: string): Promise<PermittedModel[]>;
  abstract findDefault(orgId: string): Promise<PermittedModel | undefined>;
  abstract findOne(params: FindOneParams): Promise<PermittedModel | undefined>;
  abstract create(permittedModel: PermittedModel): Promise<PermittedModel>;
  abstract delete(params: { id: UUID; orgId: UUID }): Promise<void>;
  abstract setAsDefault(params: {
    id: UUID;
    orgId: UUID;
  }): Promise<PermittedModel>;
}
