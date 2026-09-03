import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { UUID } from 'crypto';
import { In, type FindManyOptions, type Repository } from 'typeorm';
import type {
  PermittedEmbeddingModel,
  PermittedImageGenerationModel,
  PermittedLanguageModel,
} from 'src/domain/models/domain/permitted-model.entity';
import { ModelType } from 'src/domain/models/domain/value-objects/model-type.enum';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import {
  EmbeddingModelRecord,
  ImageGenerationModelRecord,
  LanguageModelRecord,
} from 'src/domain/models/infrastructure/persistence/local-models/schema/model.record';
import { PermittedModelRecord } from './schema/permitted-model.record';
import { PermittedModelMapper } from './mappers/permitted-model.mapper';

@Injectable()
export class PermittedModelFinder {
  private readonly logger = new Logger(PermittedModelFinder.name);

  constructor(
    @InjectRepository(PermittedModelRecord)
    private readonly permittedModelRepository: Repository<PermittedModelRecord>,
    private readonly permittedModelMapper: PermittedModelMapper,
  ) {}

  async findOneEmbedding(orgId: UUID): Promise<PermittedEmbeddingModel | null> {
    this.logger.debug({ orgId }, 'findOneEmbedding');
    const permittedEmbeddingModels = await this.findManyEmbedding(orgId);
    if (permittedEmbeddingModels.length === 0) {
      return null;
    }
    if (permittedEmbeddingModels.length > 1) {
      this.logger.warn(
        {
          orgId,
          permittedEmbeddingModelIds: permittedEmbeddingModels.map((m) => m.id),
        },
        'Multiple permitted embedding models found for org; returning the first. Write path enforces single-per-org.',
      );
    }
    return permittedEmbeddingModels[0];
  }

  async findOneImageGeneration(
    orgId: UUID,
  ): Promise<PermittedImageGenerationModel | null> {
    this.logger.debug({ orgId }, 'findOneImageGeneration');
    const permittedImageGenerationModels =
      await this.findManyImageGeneration(orgId);
    if (permittedImageGenerationModels.length === 0) {
      return null;
    }
    if (permittedImageGenerationModels.length > 1) {
      this.logger.warn(
        {
          orgId,
          permittedImageGenerationModelIds: permittedImageGenerationModels.map(
            (m) => m.id,
          ),
        },
        'Multiple permitted image-generation models found for org; returning the first. Write path enforces single-per-org.',
      );
    }
    return permittedImageGenerationModels[0];
  }

  async findManyEmbedding(orgId: UUID): Promise<PermittedEmbeddingModel[]> {
    const permittedModels = await this.permittedModelRepository.find(
      this.buildActiveScopedQuery({
        orgId,
        scope: PermittedModelScope.ORG,
        modelType: ModelType.EMBEDDING,
      }),
    );
    return permittedModels
      .filter(
        (permittedModel) =>
          permittedModel.model instanceof EmbeddingModelRecord,
      )
      .map((permittedModel) =>
        this.permittedModelMapper.toDomain(permittedModel),
      ) as PermittedEmbeddingModel[];
  }

  async findManyImageGeneration(
    orgId: UUID,
  ): Promise<PermittedImageGenerationModel[]> {
    const permittedModels = await this.permittedModelRepository.find(
      this.buildActiveScopedQuery({
        orgId,
        scope: PermittedModelScope.ORG,
        modelType: ModelType.IMAGE_GENERATION,
      }),
    );
    return permittedModels
      .filter(
        (permittedModel) =>
          permittedModel.model instanceof ImageGenerationModelRecord,
      )
      .map((permittedModel) =>
        this.permittedModelMapper.toDomain(permittedModel),
      );
  }

  async findManyLanguage(orgId: UUID): Promise<PermittedLanguageModel[]> {
    const permittedModels = await this.permittedModelRepository.find(
      this.buildActiveScopedQuery({
        orgId,
        scope: PermittedModelScope.ORG,
        modelType: ModelType.LANGUAGE,
      }),
    );
    return permittedModels
      .filter(
        (permittedModel) => permittedModel.model instanceof LanguageModelRecord,
      )
      .map((permittedModel) =>
        this.permittedModelMapper.toDomain(permittedModel),
      ) as PermittedLanguageModel[];
  }

  async findManyLanguageByTeam(
    teamId: UUID,
    orgId: UUID,
  ): Promise<PermittedLanguageModel[]> {
    return this.findManyLanguageByTeams([teamId], orgId);
  }

  async findManyLanguageByTeams(
    teamIds: UUID[],
    orgId: UUID,
  ): Promise<PermittedLanguageModel[]> {
    if (teamIds.length === 0) return [];
    const permittedModels = await this.findTeamModels(
      teamIds,
      orgId,
      ModelType.LANGUAGE,
    );
    return permittedModels
      .filter(
        (permittedModel) => permittedModel.model instanceof LanguageModelRecord,
      )
      .map((permittedModel) =>
        this.permittedModelMapper.toDomain(permittedModel),
      ) as PermittedLanguageModel[];
  }

  async findManyTeamDefaultLanguage(
    teamIds: UUID[],
    orgId: UUID,
  ): Promise<PermittedLanguageModel[]> {
    if (teamIds.length === 0) return [];
    const permittedModels = await this.findTeamModels(
      teamIds,
      orgId,
      ModelType.LANGUAGE,
      true,
    );
    return permittedModels
      .filter(
        (permittedModel) => permittedModel.model instanceof LanguageModelRecord,
      )
      .map((permittedModel) =>
        this.permittedModelMapper.toDomain(permittedModel),
      ) as PermittedLanguageModel[];
  }

  async findManyImageGenerationByTeam(
    teamId: UUID,
    orgId: UUID,
  ): Promise<PermittedImageGenerationModel[]> {
    return this.findManyImageGenerationByTeams([teamId], orgId);
  }

  async findManyImageGenerationByTeams(
    teamIds: UUID[],
    orgId: UUID,
  ): Promise<PermittedImageGenerationModel[]> {
    if (teamIds.length === 0) return [];
    const permittedModels = await this.findTeamModels(
      teamIds,
      orgId,
      ModelType.IMAGE_GENERATION,
    );
    return permittedModels
      .filter(
        (permittedModel) =>
          permittedModel.model instanceof ImageGenerationModelRecord,
      )
      .map((permittedModel) =>
        this.permittedModelMapper.toDomain(permittedModel),
      );
  }

  private findTeamModels(
    teamIds: UUID[],
    orgId: UUID,
    modelType: ModelType,
    isDefault?: boolean,
  ): Promise<PermittedModelRecord[]> {
    return this.permittedModelRepository.find(
      this.buildActiveScopedQuery({
        orgId,
        scope: PermittedModelScope.TEAM,
        teamIds: [...new Set(teamIds)],
        modelType,
        isDefault,
      }),
    );
  }

  private buildActiveScopedQuery(params: {
    orgId: UUID;
    scope: PermittedModelScope;
    modelType?: ModelType;
    scopeId?: UUID;
    teamIds?: UUID[];
    isDefault?: boolean;
  }): FindManyOptions<PermittedModelRecord> {
    const { orgId, scope, modelType, scopeId, teamIds, isDefault } = params;
    return {
      where: {
        orgId,
        scope,
        ...(scopeId && { scopeId }),
        ...(teamIds && { scopeId: In(teamIds) }),
        ...(isDefault !== undefined && { isDefault }),
        model: {
          isArchived: false,
          ...(modelType && { type: modelType }),
        },
      },
      relations: {
        model: true,
      },
    };
  }
}
