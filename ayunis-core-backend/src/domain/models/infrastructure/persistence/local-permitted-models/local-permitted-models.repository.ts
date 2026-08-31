import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOneParams,
  PermittedModelsRepository,
} from 'src/domain/models/application/ports/permitted-models.repository';
import {
  PermittedEmbeddingModel,
  PermittedImageGenerationModel,
  PermittedLanguageModel,
  PermittedModel,
} from 'src/domain/models/domain/permitted-model.entity';
import type { EntityManager, FindOptionsWhere } from 'typeorm';
import { Repository } from 'typeorm';
import { PermittedModelRecord } from './schema/permitted-model.record';
import { UUID } from 'crypto';
import { PermittedModelMapper } from './mappers/permitted-model.mapper';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { ModelType } from 'src/domain/models/domain/value-objects/model-type.enum';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import { LanguageModelRecord } from 'src/domain/models/infrastructure/persistence/local-models/schema/model.record';
import {
  DuplicateTeamPermittedModelError,
  MultipleTeamImageGenerationModelsNotAllowedError,
  NotALanguageModelError,
  PermittedModelNotFoundError,
} from 'src/domain/models/application/models.errors';
import { ImageGenerationModel } from 'src/domain/models/domain/models/image-generation.model';
import { PermittedModelFinder } from './permitted-model-finder';

const PG_UNIQUE_VIOLATION = '23505';

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const record = error as Record<string, unknown>;
  const driverError = record.driverError as Record<string, unknown> | undefined;
  return (driverError?.code ?? record.code) === PG_UNIQUE_VIOLATION;
}

@Injectable()
export class LocalPermittedModelsRepository extends PermittedModelsRepository {
  constructor(
    @InjectPinoLogger(LocalPermittedModelsRepository.name)
    private readonly logger: PinoLogger,

    @InjectRepository(PermittedModelRecord)
    private readonly permittedModelRepository: Repository<PermittedModelRecord>,
    private readonly permittedModelMapper: PermittedModelMapper,
    private readonly finder: PermittedModelFinder,
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
    this.logger.info(
      {
        orgId,
      },
      'findDefault',
    );
    const permittedModel = await this.permittedModelRepository.findOne({
      where: {
        orgId,
        isDefault: true,
        scope: PermittedModelScope.ORG,
        // `type` is TypeORM's discriminator column (see @TableInheritance on
        // ModelRecord); FindOptionsWhere doesn't expose it, so cast.
        model: { isArchived: false, type: ModelType.LANGUAGE },
      } as FindOptionsWhere<PermittedModelRecord>,
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
    this.logger.debug(
      {
        permittedModel,
      },
      'Default model found',
    );
    return this.permittedModelMapper.toDomain(
      permittedModel,
    ) as PermittedLanguageModel;
  }

  async findTeamDefaultLanguage(
    teamId: UUID,
    orgId: UUID,
  ): Promise<PermittedLanguageModel | null> {
    this.logger.info({ teamId, orgId }, 'findTeamDefaultLanguage');
    const permittedModel = await this.permittedModelRepository.findOne({
      where: {
        scopeId: teamId,
        orgId,
        isDefault: true,
        scope: PermittedModelScope.TEAM,
        model: { isArchived: false, type: ModelType.LANGUAGE },
      } as FindOptionsWhere<PermittedModelRecord>,
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
    return this.finder.findOneEmbedding(orgId);
  }

  async findOneImageGeneration(
    orgId: UUID,
  ): Promise<PermittedImageGenerationModel | null> {
    return this.finder.findOneImageGeneration(orgId);
  }

  async findManyLanguage(orgId: UUID): Promise<PermittedLanguageModel[]> {
    return this.finder.findManyLanguage(orgId);
  }

  async findManyLanguageByTeam(
    teamId: UUID,
    orgId: UUID,
  ): Promise<PermittedLanguageModel[]> {
    return this.finder.findManyLanguageByTeam(teamId, orgId);
  }

  async findManyImageGenerationByTeam(
    teamId: UUID,
    orgId: UUID,
  ): Promise<PermittedImageGenerationModel[]> {
    return this.finder.findManyImageGenerationByTeam(teamId, orgId);
  }

  async create(permittedModel: PermittedModel): Promise<PermittedModel> {
    return this.persist(permittedModel, this.permittedModelRepository);
  }

  async createTeamScoped(
    permittedModel: PermittedModel,
  ): Promise<PermittedModel> {
    if (
      permittedModel.scope !== PermittedModelScope.TEAM ||
      !permittedModel.scopeId
    ) {
      throw new Error('Team-scoped grant requires a team scope');
    }

    try {
      if (permittedModel.model instanceof ImageGenerationModel) {
        return await this.permittedModelRepository.manager.transaction(
          async (manager) => this.createTeamImageGrant(manager, permittedModel),
        );
      }
      return await this.persist(permittedModel, this.permittedModelRepository);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new DuplicateTeamPermittedModelError(
          permittedModel.scopeId,
          permittedModel.model.id,
        );
      }
      throw error;
    }
  }

  private async createTeamImageGrant(
    manager: EntityManager,
    permittedModel: PermittedModel,
  ): Promise<PermittedModel> {
    const teamId = permittedModel.scopeId;
    if (!teamId) throw new Error('Team-scoped grant requires a team ID');
    await manager.query(
      'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
      [`team-image-grant:${teamId}`],
    );
    const repository = manager.getRepository(PermittedModelRecord);
    const existing = await repository.findOne({
      where: {
        orgId: permittedModel.orgId,
        scope: PermittedModelScope.TEAM,
        scopeId: teamId,
        model: { type: ModelType.IMAGE_GENERATION },
      } as FindOptionsWhere<PermittedModelRecord>,
      relations: { model: true },
    });
    if (existing?.modelId === permittedModel.model.id) {
      throw new DuplicateTeamPermittedModelError(
        teamId,
        permittedModel.model.id,
      );
    }
    if (existing) {
      throw new MultipleTeamImageGenerationModelsNotAllowedError(teamId);
    }
    return this.persist(permittedModel, repository);
  }

  private async persist(
    permittedModel: PermittedModel,
    repository: Repository<PermittedModelRecord>,
  ): Promise<PermittedModel> {
    const record = this.permittedModelMapper.toRecord(permittedModel);
    const saved = await repository.save(record);
    return this.permittedModelMapper.toDomain(saved);
  }

  async delete(params: { id: UUID; orgId: UUID }): Promise<void> {
    const result = await this.permittedModelRepository.delete(params);
    if (result.affected === 0) {
      throw new Error(
        `Permitted model with id ${params.id} and orgId ${params.orgId} not found`,
      );
    }
  }

  async setAsDefault(params: {
    id: UUID;
    orgId: UUID;
    teamId?: UUID;
  }): Promise<PermittedLanguageModel> {
    this.logger.info(
      {
        id: params.id,
        orgId: params.orgId,
        teamId: params.teamId,
      },
      'setAsDefault',
    );

    const unsetWhere = this.buildUnsetDefaultWhere(params);
    const setWhere = this.buildSetDefaultWhere(params);
    const targetModel = await this.permittedModelRepository.findOne({
      where: {
        ...setWhere,
        model: { isArchived: false },
      },
      relations: {
        model: true,
      },
    });

    if (!targetModel) {
      throw new PermittedModelNotFoundError(params.id);
    }
    if (!(targetModel.model instanceof LanguageModelRecord)) {
      throw new NotALanguageModelError(targetModel.model.id);
    }

    return await this.permittedModelRepository.manager.transaction((manager) =>
      this.applyDefaultInTransaction(manager, params, unsetWhere, setWhere),
    );
  }

  private async applyDefaultInTransaction(
    manager: EntityManager,
    params: { id: UUID; orgId: UUID; teamId?: UUID },
    unsetWhere: FindOptionsWhere<PermittedModelRecord>,
    setWhere: FindOptionsWhere<PermittedModelRecord>,
  ): Promise<PermittedLanguageModel> {
    await manager.update(PermittedModelRecord, unsetWhere, {
      isDefault: false,
    });

    const updateResult = await manager.update(PermittedModelRecord, setWhere, {
      isDefault: true,
    });

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

    this.logger.debug(
      {
        id: params.id,
        orgId: params.orgId,
        teamId: params.teamId,
        modelName: updatedModel.model.name,
        modelProvider: updatedModel.model.provider,
      },
      'Model set as default',
    );

    return this.permittedModelMapper.toDomain(
      updatedModel,
    ) as PermittedLanguageModel;
  }

  async update(permittedModel: PermittedModel): Promise<PermittedModel> {
    this.logger.info(
      {
        id: permittedModel.id,
        orgId: permittedModel.orgId,
        anonymousOnly: permittedModel.anonymousOnly,
      },
      'update',
    );

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
    this.logger.info({ catalogModelId }, 'findAllByCatalogModelId');

    const permittedModels = await this.permittedModelRepository.find({
      where: { modelId: catalogModelId },
      relations: { model: true },
    });

    this.logger.debug(
      {
        catalogModelId,
        count: permittedModels.length,
      },
      'Found permitted models by catalog model id',
    );

    return permittedModels.map((pm) => this.permittedModelMapper.toDomain(pm));
  }

  async unsetDefaultsByCatalogModelId(catalogModelId: UUID): Promise<void> {
    this.logger.info({ catalogModelId }, 'unsetDefaultsByCatalogModelId');

    const result = await this.permittedModelRepository.update(
      { modelId: catalogModelId, isDefault: true },
      { isDefault: false },
    );

    this.logger.debug(
      {
        catalogModelId,
        affected: result.affected,
      },
      'Unset defaults for catalog model',
    );
  }

  private buildUnsetDefaultWhere(params: {
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

  private buildSetDefaultWhere(params: {
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
}
