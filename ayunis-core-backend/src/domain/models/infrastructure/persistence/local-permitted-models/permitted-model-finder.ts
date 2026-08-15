import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
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
export class PermittedModelFinder {
  constructor(
    @InjectPinoLogger(PermittedModelFinder.name)
    private readonly logger: PinoLogger,

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

  async findManyImageGenerationByTeam(
    teamId: UUID,
    orgId: UUID,
  ): Promise<PermittedImageGenerationModel[]> {
    const permittedModels = await this.permittedModelRepository.find(
      this.buildActiveScopedQuery({
        orgId,
        scope: PermittedModelScope.TEAM,
        scopeId: teamId,
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
