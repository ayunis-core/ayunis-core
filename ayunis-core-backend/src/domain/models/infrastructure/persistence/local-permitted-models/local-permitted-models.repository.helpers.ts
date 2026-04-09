import type { Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import type { FindOptionsWhere, Repository } from 'typeorm';
import type { FindManyOptions } from 'typeorm';
import {
  MultipleEmbeddingModelsNotAllowedError,
  MultipleImageGenerationModelsNotAllowedError,
} from 'src/domain/models/application/models.errors';
import type {
  PermittedEmbeddingModel,
  PermittedImageGenerationModel,
  PermittedLanguageModel,
} from 'src/domain/models/domain/permitted-model.entity';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import {
  EmbeddingModelRecord,
  ImageGenerationModelRecord,
  LanguageModelRecord,
} from '../local-models/schema/model.record';
import type { PermittedModelRecord } from './schema/permitted-model.record';
import type { PermittedModelMapper } from './mappers/permitted-model.mapper';

type RepositoryDeps = {
  logger: Logger;
  permittedModelMapper: PermittedModelMapper;
  permittedModelRepository: Repository<PermittedModelRecord>;
};

function buildActiveOrgScopedQuery(
  orgId: UUID,
): FindManyOptions<PermittedModelRecord> {
  return {
    where: {
      orgId,
      scope: PermittedModelScope.ORG,
      model: { isArchived: false },
    },
    relations: {
      model: true,
    },
  };
}

export async function findOneEmbeddingModel(
  deps: RepositoryDeps,
  orgId: UUID,
): Promise<PermittedEmbeddingModel | null> {
  deps.logger.debug('findOneEmbedding', { orgId });
  const permittedModels = await deps.permittedModelRepository.find(
    buildActiveOrgScopedQuery(orgId),
  );
  const permittedEmbeddingModels = permittedModels.filter(
    (permittedModel) => permittedModel.model instanceof EmbeddingModelRecord,
  );
  if (permittedEmbeddingModels.length === 0) {
    return null;
  }
  if (permittedEmbeddingModels.length > 1) {
    deps.logger.error('Multiple embedding models found', {
      orgId,
      permittedEmbeddingModels,
    });
    throw new MultipleEmbeddingModelsNotAllowedError({
      orgId,
      permittedEmbeddingModelIds: permittedEmbeddingModels.map(
        (permittedModel) => permittedModel.id,
      ),
    });
  }
  return deps.permittedModelMapper.toDomain(
    permittedEmbeddingModels[0],
  ) as PermittedEmbeddingModel;
}

export async function findOneImageGenerationModel(
  deps: RepositoryDeps,
  orgId: UUID,
): Promise<PermittedImageGenerationModel | null> {
  deps.logger.debug('findOneImageGeneration', { orgId });
  const permittedModels = await deps.permittedModelRepository.find(
    buildActiveOrgScopedQuery(orgId),
  );
  const permittedImageGenerationModels = permittedModels.filter(
    (permittedModel) =>
      permittedModel.model instanceof ImageGenerationModelRecord,
  );
  if (permittedImageGenerationModels.length === 0) {
    return null;
  }
  if (permittedImageGenerationModels.length > 1) {
    deps.logger.error('Multiple image-generation models found', {
      orgId,
      permittedImageGenerationModels,
    });
    throw new MultipleImageGenerationModelsNotAllowedError({
      orgId,
      permittedImageGenerationModelIds: permittedImageGenerationModels.map(
        (permittedModel) => permittedModel.id,
      ),
    });
  }
  return deps.permittedModelMapper.toDomain(
    permittedImageGenerationModels[0],
  ) as PermittedImageGenerationModel;
}

export async function findManyLanguageModels(
  deps: RepositoryDeps,
  orgId: UUID,
): Promise<PermittedLanguageModel[]> {
  const permittedModels = await deps.permittedModelRepository.find(
    buildActiveOrgScopedQuery(orgId),
  );
  return permittedModels
    .filter(
      (permittedModel) => permittedModel.model instanceof LanguageModelRecord,
    )
    .map((permittedModel) =>
      deps.permittedModelMapper.toDomain(permittedModel),
    ) as PermittedLanguageModel[];
}

export async function findManyLanguageModelsByTeam(
  deps: RepositoryDeps,
  teamId: UUID,
  orgId: UUID,
): Promise<PermittedLanguageModel[]> {
  const permittedModels = await deps.permittedModelRepository.find({
    where: {
      scopeId: teamId,
      orgId,
      scope: PermittedModelScope.TEAM,
      model: { isArchived: false },
    },
    relations: {
      model: true,
    },
  });
  return permittedModels
    .filter(
      (permittedModel) => permittedModel.model instanceof LanguageModelRecord,
    )
    .map((permittedModel) =>
      deps.permittedModelMapper.toDomain(permittedModel),
    ) as PermittedLanguageModel[];
}

export async function findExistingPermittedImageGenerationModels(
  deps: RepositoryDeps,
  orgId: UUID,
): Promise<PermittedImageGenerationModel[]> {
  const permittedModels = await deps.permittedModelRepository.find(
    buildActiveOrgScopedQuery(orgId),
  );
  return permittedModels
    .filter(
      (permittedModel) =>
        permittedModel.model instanceof ImageGenerationModelRecord,
    )
    .map((permittedModel) =>
      deps.permittedModelMapper.toDomain(permittedModel),
    ) as PermittedImageGenerationModel[];
}

export function buildUnsetDefaultWhere(params: {
  orgId: UUID;
  teamId?: UUID;
}): FindOptionsWhere<PermittedModelRecord> {
  return params.teamId
    ? {
        orgId: params.orgId,
        scopeId: params.teamId,
        scope: PermittedModelScope.TEAM,
        isDefault: true,
      }
    : {
        orgId: params.orgId,
        scope: PermittedModelScope.ORG,
        isDefault: true,
      };
}

export function buildSetDefaultWhere(params: {
  id: UUID;
  orgId: UUID;
  teamId?: UUID;
}): FindOptionsWhere<PermittedModelRecord> {
  return params.teamId
    ? {
        id: params.id,
        orgId: params.orgId,
        scopeId: params.teamId,
        scope: PermittedModelScope.TEAM,
      }
    : {
        id: params.id,
        orgId: params.orgId,
        scope: PermittedModelScope.ORG,
      };
}
