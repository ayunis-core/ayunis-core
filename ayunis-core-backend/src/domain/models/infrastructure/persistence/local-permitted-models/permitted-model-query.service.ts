import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { UUID } from 'crypto';
import type { FindManyOptions, Repository } from 'typeorm';
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
} from '../local-models/schema/model.record';
import { PermittedModelRecord } from './schema/permitted-model.record';
import { PermittedModelMapper } from './mappers/permitted-model.mapper';

@Injectable()
export class PermittedModelQueryService {
  private readonly logger = new Logger(PermittedModelQueryService.name);

  constructor(
    @InjectRepository(PermittedModelRecord)
    private readonly permittedModelRepository: Repository<PermittedModelRecord>,
    private readonly permittedModelMapper: PermittedModelMapper,
  ) {}

  async findOneEmbedding(orgId: UUID): Promise<PermittedEmbeddingModel | null> {
    this.logger.debug('findOneEmbedding', { orgId });
    const permittedEmbeddingModels = await this.findManyEmbedding(orgId);
    if (permittedEmbeddingModels.length === 0) {
      return null;
    }
    if (permittedEmbeddingModels.length > 1) {
      this.logger.warn(
        'Multiple permitted embedding models found for org; returning the first. Write path enforces single-per-org.',
        {
          orgId,
          permittedEmbeddingModelIds: permittedEmbeddingModels.map((m) => m.id),
        },
      );
    }
    return permittedEmbeddingModels[0];
  }

  async findOneImageGeneration(
    orgId: UUID,
  ): Promise<PermittedImageGenerationModel | null> {
    this.logger.debug('findOneImageGeneration', { orgId });
    const permittedImageGenerationModels =
      await this.findManyImageGeneration(orgId);
    if (permittedImageGenerationModels.length === 0) {
      return null;
    }
    if (permittedImageGenerationModels.length > 1) {
      this.logger.warn(
        'Multiple permitted image-generation models found for org; returning the first. Write path enforces single-per-org.',
        {
          orgId,
          permittedImageGenerationModelIds: permittedImageGenerationModels.map(
            (m) => m.id,
          ),
        },
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
      ) as PermittedImageGenerationModel[];
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
    const permittedModels = await this.permittedModelRepository.find(
      this.buildActiveScopedQuery({
        orgId,
        scope: PermittedModelScope.TEAM,
        scopeId: teamId,
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

  private buildActiveScopedQuery(params: {
    orgId: UUID;
    scope: PermittedModelScope;
    modelType?: ModelType;
    scopeId?: UUID;
  }): FindManyOptions<PermittedModelRecord> {
    const { orgId, scope, modelType, scopeId } = params;
    return {
      where: {
        orgId,
        scope,
        ...(scopeId && { scopeId }),
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
