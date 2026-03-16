import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOneParams,
  PermittedModelsRepository,
} from 'src/domain/models/application/ports/permitted-models.repository';
import {
  PermittedEmbeddingModel,
  PermittedLanguageModel,
  PermittedModel,
} from 'src/domain/models/domain/permitted-model.entity';
import { FindOptionsWhere, Repository } from 'typeorm';
import { PermittedModelRecord } from './schema/permitted-model.record';
import { UUID } from 'crypto';
import { PermittedModelMapper } from './mappers/permitted-model.mapper';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import {
  EmbeddingModelRecord,
  LanguageModelRecord,
} from '../local-models/schema/model.record';
import { EmbeddingModel } from 'src/domain/models/domain/models/embedding.model';
import { MultipleEmbeddingModelsNotAllowedError } from 'src/domain/models/application/models.errors';

@Injectable()
export class LocalPermittedModelsRepository extends PermittedModelsRepository {
  private readonly logger = new Logger(LocalPermittedModelsRepository.name);
  constructor(
    @InjectRepository(PermittedModelRecord)
    private readonly permittedModelRepository: Repository<PermittedModelRecord>,
    private readonly permittedModelMapper: PermittedModelMapper,
  ) {
    super();
  }

  async findAll(
    orgId: UUID,
    filter?: {
      provider?: ModelProvider;
      modelId?: UUID;
    },
  ): Promise<PermittedModel[]> {
    const permittedModels = await this.permittedModelRepository.find({
      where: {
        orgId,
        scope: PermittedModelScope.ORG,
        model: { provider: filter?.provider, id: filter?.modelId },
      },
      relations: {
        model: true,
      },
    });
    return permittedModels.map((permittedModel) =>
      this.permittedModelMapper.toDomain(permittedModel),
    );
  }

  async findOrgDefaultLanguage(
    orgId: UUID,
  ): Promise<PermittedLanguageModel | null> {
    this.logger.log('findDefault', {
      orgId,
    });
    const permittedModel = await this.permittedModelRepository.findOne({
      where: {
        orgId,
        isDefault: true,
        scope: PermittedModelScope.ORG,
        model: { isArchived: false },
      },
      relations: {
        model: true,
      },
    });
    if (
      !permittedModel ||
      !(permittedModel.model instanceof LanguageModelRecord)
    ) {
      return null;
    }
    this.logger.debug('Default model found', {
      permittedModel,
    });
    return this.permittedModelMapper.toDomain(
      permittedModel,
    ) as PermittedLanguageModel;
  }

  async findTeamDefaultLanguage(
    teamId: UUID,
    orgId: UUID,
  ): Promise<PermittedLanguageModel | null> {
    this.logger.log('findTeamDefaultLanguage', { teamId, orgId });
    const permittedModel = await this.permittedModelRepository.findOne({
      where: {
        teamId,
        orgId,
        isDefault: true,
        scope: PermittedModelScope.TEAM,
        model: { isArchived: false },
      },
      relations: {
        model: true,
      },
    });
    if (
      !permittedModel ||
      !(permittedModel.model instanceof LanguageModelRecord)
    ) {
      return null;
    }
    return this.permittedModelMapper.toDomain(
      permittedModel,
    ) as PermittedLanguageModel;
  }

  async findOne(params: FindOneParams): Promise<PermittedModel | null> {
    const where =
      'id' in params
        ? { id: params.id, ...(params.orgId && { orgId: params.orgId }) }
        : {
            model: { name: params.name, provider: params.provider },
            ...(params.orgId && { orgId: params.orgId }),
            scope: PermittedModelScope.ORG,
          };
    const permittedModel = await this.permittedModelRepository.findOne({
      where,
      relations: {
        model: true,
      },
    });
    if (!permittedModel) {
      return null;
    }
    return this.permittedModelMapper.toDomain(permittedModel);
  }

  async findOneLanguage(
    params: FindOneParams,
  ): Promise<PermittedLanguageModel | null> {
    const where =
      'id' in params
        ? {
            id: params.id,
            ...(params.orgId && { orgId: params.orgId }),
            model: { isArchived: false },
          }
        : {
            model: {
              name: params.name,
              provider: params.provider,
              isArchived: false,
            },
            ...(params.orgId && { orgId: params.orgId }),
            scope: PermittedModelScope.ORG,
          };
    const permittedModel = await this.permittedModelRepository.findOne({
      where,
      relations: {
        model: true,
      },
    });
    if (
      !permittedModel ||
      !(permittedModel.model instanceof LanguageModelRecord)
    ) {
      return null;
    }
    return this.permittedModelMapper.toDomain(
      permittedModel,
    ) as PermittedLanguageModel;
  }

  async findOneEmbedding(orgId: UUID): Promise<PermittedEmbeddingModel | null> {
    this.logger.debug('findOneEmbedding', { orgId });
    const permittedModels = await this.permittedModelRepository.find({
      where: {
        orgId,
        scope: PermittedModelScope.ORG,
        model: { isArchived: false },
      },
      relations: {
        model: true,
      },
    });
    const permittedEmbeddingModels = permittedModels.filter(
      (permittedModel) => permittedModel.model instanceof EmbeddingModelRecord,
    );
    if (permittedEmbeddingModels.length === 0) {
      return null;
    }
    if (permittedEmbeddingModels.length > 1) {
      this.logger.error('Multiple embedding models found', {
        orgId,
        permittedEmbeddingModels,
      });
      throw new Error(
        `Multiple embedding models found for orgId ${orgId}. This should not happen.`,
      );
    }
    const permittedModel = permittedEmbeddingModels[0];
    return this.permittedModelMapper.toDomain(
      permittedModel,
    ) as PermittedEmbeddingModel;
  }

  async findManyLanguage(orgId: UUID): Promise<PermittedLanguageModel[]> {
    const permittedModels = await this.permittedModelRepository.find({
      where: {
        orgId,
        scope: PermittedModelScope.ORG,
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
        this.permittedModelMapper.toDomain(permittedModel),
      ) as PermittedLanguageModel[];
  }

  async findManyLanguageByTeam(
    teamId: UUID,
    orgId: UUID,
  ): Promise<PermittedLanguageModel[]> {
    const permittedModels = await this.permittedModelRepository.find({
      where: {
        teamId,
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
        this.permittedModelMapper.toDomain(permittedModel),
      ) as PermittedLanguageModel[];
  }

  async findByTeamAndModelId(
    teamId: UUID,
    modelId: UUID,
    orgId: UUID,
  ): Promise<PermittedModel | null> {
    const record = await this.permittedModelRepository.findOne({
      where: {
        teamId,
        modelId,
        orgId,
        scope: PermittedModelScope.TEAM,
      },
      relations: { model: true },
    });
    if (!record) {
      return null;
    }
    return this.permittedModelMapper.toDomain(record);
  }

  async create(permittedModel: PermittedModel): Promise<PermittedModel> {
    // Enforce single permitted embedding model per org at repository layer
    if (permittedModel.model instanceof EmbeddingModel) {
      const existingEmbedding = await this.findOneEmbedding(
        permittedModel.orgId,
      );
      if (existingEmbedding) {
        this.logger.error(
          'Attempt to create a second permitted embedding model for org',
          {
            orgId: permittedModel.orgId,
            existingPermittedEmbeddingModelId: existingEmbedding.id,
            newModelId: permittedModel.model.id,
          },
        );
        throw new MultipleEmbeddingModelsNotAllowedError({
          orgId: permittedModel.orgId,
          existingPermittedEmbeddingModelId: existingEmbedding.id,
          newModelId: permittedModel.model.id,
        });
      }
    }

    const permittedModelEntity =
      this.permittedModelMapper.toRecord(permittedModel);
    const savedPermittedModel =
      await this.permittedModelRepository.save(permittedModelEntity);
    const reloadedPermittedModel =
      await this.permittedModelRepository.findOneOrFail({
        where: { id: savedPermittedModel.id },
        relations: {
          model: true,
        },
      });
    return this.permittedModelMapper.toDomain(reloadedPermittedModel);
  }

  async delete(params: { id: UUID; orgId: UUID }): Promise<void> {
    const result = await this.permittedModelRepository.delete(params);
    if (result.affected === 0) {
      throw new Error(
        `Permitted model with id ${params.id} and orgId ${params.orgId} not found`,
      );
    }
  }

  async deleteTeamScopedByOrgAndModelId(
    orgId: UUID,
    modelId: UUID,
  ): Promise<void> {
    this.logger.log('deleteTeamScopedByOrgAndModelId', { orgId, modelId });
    const result = await this.permittedModelRepository.delete({
      orgId,
      modelId,
      scope: PermittedModelScope.TEAM,
    });
    this.logger.debug('Deleted team-scoped permitted models', {
      orgId,
      modelId,
      affected: result.affected,
    });
  }

  async setAsDefault(params: {
    id: UUID;
    orgId: UUID;
    teamId?: UUID;
  }): Promise<PermittedLanguageModel> {
    this.logger.log('setAsDefault', {
      id: params.id,
      orgId: params.orgId,
      teamId: params.teamId,
    });

    const unsetWhere = this.buildUnsetDefaultWhere(params);
    const setWhere = this.buildSetDefaultWhere(params);

    // Start a transaction to ensure consistency
    return await this.permittedModelRepository.manager.transaction(
      async (manager) => {
        await manager.update(PermittedModelRecord, unsetWhere, {
          isDefault: false,
        });

        const updateResult = await manager.update(
          PermittedModelRecord,
          setWhere,
          { isDefault: true },
        );

        if (updateResult.affected === 0) {
          throw new Error(
            `Permitted model with id ${params.id} and orgId ${params.orgId} not found`,
          );
        }

        const updatedModel = await manager.findOne(PermittedModelRecord, {
          where: { id: params.id, orgId: params.orgId },
          relations: ['model'],
        });

        if (!updatedModel) {
          throw new Error(
            `Failed to retrieve updated permitted model with id ${params.id}`,
          );
        }

        this.logger.debug('Model set as default', {
          id: params.id,
          orgId: params.orgId,
          teamId: params.teamId,
          modelName: updatedModel.model.name,
          modelProvider: updatedModel.model.provider,
        });

        return this.permittedModelMapper.toDomain(
          updatedModel,
        ) as PermittedLanguageModel;
      },
    );
  }

  async update(permittedModel: PermittedModel): Promise<PermittedModel> {
    this.logger.log('update', {
      id: permittedModel.id,
      orgId: permittedModel.orgId,
      anonymousOnly: permittedModel.anonymousOnly,
    });

    const updateResult = await this.permittedModelRepository.update(
      { id: permittedModel.id, orgId: permittedModel.orgId },
      { anonymousOnly: permittedModel.anonymousOnly },
    );

    if (updateResult.affected === 0) {
      throw new Error(
        `Permitted model with id ${permittedModel.id} and orgId ${permittedModel.orgId} not found`,
      );
    }

    const updatedModel = await this.permittedModelRepository.findOneOrFail({
      where: { id: permittedModel.id },
      relations: { model: true },
    });

    return this.permittedModelMapper.toDomain(updatedModel);
  }

  async findAllByCatalogModelId(
    catalogModelId: UUID,
  ): Promise<PermittedModel[]> {
    this.logger.log('findAllByCatalogModelId', { catalogModelId });

    const permittedModels = await this.permittedModelRepository.find({
      where: { modelId: catalogModelId },
      relations: { model: true },
    });

    this.logger.debug('Found permitted models by catalog model id', {
      catalogModelId,
      count: permittedModels.length,
    });

    return permittedModels.map((pm) => this.permittedModelMapper.toDomain(pm));
  }

  private buildUnsetDefaultWhere(params: {
    orgId: UUID;
    teamId?: UUID;
  }): FindOptionsWhere<PermittedModelRecord> {
    return params.teamId
      ? {
          orgId: params.orgId,
          teamId: params.teamId,
          scope: PermittedModelScope.TEAM,
          isDefault: true,
        }
      : {
          orgId: params.orgId,
          scope: PermittedModelScope.ORG,
          isDefault: true,
        };
  }

  private buildSetDefaultWhere(params: {
    id: UUID;
    orgId: UUID;
    teamId?: UUID;
  }): FindOptionsWhere<PermittedModelRecord> {
    return params.teamId
      ? {
          id: params.id,
          orgId: params.orgId,
          teamId: params.teamId,
          scope: PermittedModelScope.TEAM,
        }
      : {
          id: params.id,
          orgId: params.orgId,
          scope: PermittedModelScope.ORG,
        };
  }

  async unsetDefaultsByCatalogModelId(catalogModelId: UUID): Promise<void> {
    this.logger.log('unsetDefaultsByCatalogModelId', { catalogModelId });

    const result = await this.permittedModelRepository.update(
      { modelId: catalogModelId, isDefault: true },
      { isDefault: false },
    );

    this.logger.debug('Unset defaults for catalog model', {
      catalogModelId,
      affected: result.affected,
    });
  }
}
