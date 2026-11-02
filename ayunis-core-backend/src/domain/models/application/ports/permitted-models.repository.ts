import type { UUID } from 'crypto';
import type {
  PermittedEmbeddingModel,
  PermittedImageGenerationModel,
  PermittedLanguageModel,
  PermittedModel,
} from 'src/domain/models/domain/permitted-model.entity';
import type { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';

export type FindOneParams =
  | {
      id: UUID;
      orgId?: UUID;
    }
  | {
      name: string;
      provider: ModelProvider;
      orgId?: UUID;
    };

export abstract class PermittedModelsRepository {
  abstract findAll(
    orgId: UUID,
    filter?: {
      provider?: ModelProvider;
      modelId?: UUID;
    },
  ): Promise<PermittedModel[]>;
  abstract findOne(params: FindOneParams): Promise<PermittedModel | null>;
  abstract findOneLanguage(
    params: FindOneParams,
  ): Promise<PermittedLanguageModel | null>;
  abstract findOneEmbedding(
    orgId: UUID,
  ): Promise<PermittedEmbeddingModel | null>;
  abstract findOneImageGeneration(
    orgId: UUID,
  ): Promise<PermittedImageGenerationModel | null>;
  abstract findManyLanguage(orgId: UUID): Promise<PermittedLanguageModel[]>;
  abstract findManyLanguageByTeam(
    teamId: UUID,
    orgId: UUID,
  ): Promise<PermittedLanguageModel[]>;
  abstract findManyLanguageByTeams(
    teamIds: UUID[],
    orgId: UUID,
  ): Promise<PermittedLanguageModel[]>;
  abstract findManyImageGenerationByTeam(
    teamId: UUID,
    orgId: UUID,
  ): Promise<PermittedImageGenerationModel[]>;
  abstract findManyImageGenerationByTeams(
    teamIds: UUID[],
    orgId: UUID,
  ): Promise<PermittedImageGenerationModel[]>;
  abstract create(permittedModel: PermittedModel): Promise<PermittedModel>;
  abstract createTeamScoped(
    permittedModel: PermittedModel,
  ): Promise<PermittedModel>;
  abstract delete(params: { id: UUID; orgId: UUID }): Promise<void>;
  abstract update(permittedModel: PermittedModel): Promise<PermittedModel>;
  abstract findAllByCatalogModelId(
    catalogModelId: UUID,
  ): Promise<PermittedModel[]>;
}
