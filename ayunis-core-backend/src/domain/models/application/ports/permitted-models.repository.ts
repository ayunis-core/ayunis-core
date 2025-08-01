import { UUID } from 'crypto';
import {
  PermittedEmbeddingModel,
  PermittedLanguageModel,
  PermittedModel,
} from '../../domain/permitted-model.entity';
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
  abstract findAll(
    orgId: UUID,
    filter?: {
      provider?: ModelProvider;
      modelId?: UUID;
    },
  ): Promise<PermittedModel[]>;
  abstract findOrgDefaultLanguage(
    orgId: UUID,
  ): Promise<PermittedLanguageModel | undefined>;
  abstract findOne(params: FindOneParams): Promise<PermittedModel | undefined>;
  abstract findOneLanguage(
    params: FindOneParams,
  ): Promise<PermittedLanguageModel | undefined>;
  abstract findOneEmbedding(
    params: FindOneParams,
  ): Promise<PermittedEmbeddingModel | undefined>;
  abstract findManyLanguage(orgId: UUID): Promise<PermittedLanguageModel[]>;
  abstract findManyEmbedding(orgId: UUID): Promise<PermittedEmbeddingModel[]>;
  abstract create(permittedModel: PermittedModel): Promise<PermittedModel>;
  abstract delete(params: { id: UUID; orgId: UUID }): Promise<void>;
  abstract setAsDefault(params: {
    id: UUID;
    orgId: UUID;
  }): Promise<PermittedLanguageModel>;
}
