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
    }
  | {
      name: string;
      provider: ModelProvider;
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
  ): Promise<PermittedLanguageModel | null>;
  abstract findOne(params: FindOneParams): Promise<PermittedModel | null>;
  abstract findOneLanguage(
    params: FindOneParams,
  ): Promise<PermittedLanguageModel | null>;
  abstract findOneEmbedding(
    orgId: UUID,
  ): Promise<PermittedEmbeddingModel | null>;
  abstract findManyLanguage(orgId: UUID): Promise<PermittedLanguageModel[]>;
  abstract create(permittedModel: PermittedModel): Promise<PermittedModel>;
  abstract delete(params: { id: UUID; orgId: UUID }): Promise<void>;
  abstract setAsDefault(params: {
    id: UUID;
    orgId: UUID;
  }): Promise<PermittedLanguageModel>;
  abstract update(permittedModel: PermittedModel): Promise<PermittedModel>;
  abstract findAllByCatalogModelId(
    catalogModelId: UUID,
  ): Promise<PermittedModel[]>;
  abstract unsetDefaultsByCatalogModelId(catalogModelId: UUID): Promise<void>;
}
