import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable, Logger } from '@nestjs/common';
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
import { Repository, type EntityManager, type FindOptionsWhere } from 'typeorm';
import { PermittedModelRecord } from './schema/permitted-model.record';
import { UUID } from 'crypto';
import { PermittedModelMapper } from './mappers/permitted-model.mapper';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { ModelType } from 'src/domain/models/domain/value-objects/model-type.enum';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import { LanguageModelRecord } from 'src/domain/models/infrastructure/persistence/local-models/schema/model.record';
import {
  DuplicatePermittedModelError,
  DuplicateTeamPermittedModelError,
  MultipleTeamImageGenerationModelsNotAllowedError,
} from 'src/domain/models/application/models.errors';
import { ImageGenerationModel } from 'src/domain/models/domain/models/image-generation.model';
import { PermittedModelFinder } from './permitted-model-finder';
import { isUniqueViolation } from './is-unique-violation';

@Injectable()
export class LocalPermittedModelsRepository extends PermittedModelsRepository {
  private readonly logger = new Logger(LocalPermittedModelsRepository.name);

  constructor(
    @InjectRepository(PermittedModelRecord)
    private readonly defaultRepo: Repository<PermittedModelRecord>,
    private readonly permittedModelMapper: PermittedModelMapper,
    private readonly finder: PermittedModelFinder,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  private get permittedModelRepository(): Repository<PermittedModelRecord> {
    const manager = this.txHost.tx as EntityManager | undefined;
    return manager?.getRepository(PermittedModelRecord) ?? this.defaultRepo;
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
  async findManyLanguageByTeams(teamIds: UUID[], orgId: UUID) {
    return this.finder.findManyLanguageByTeams(teamIds, orgId);
  }
  async findManyImageGenerationByTeam(
    teamId: UUID,
    orgId: UUID,
  ): Promise<PermittedImageGenerationModel[]> {
    return this.finder.findManyImageGenerationByTeam(teamId, orgId);
  }
  async findManyImageGenerationByTeams(teamIds: UUID[], orgId: UUID) {
    return this.finder.findManyImageGenerationByTeams(teamIds, orgId);
  }
  async create(permittedModel: PermittedModel): Promise<PermittedModel> {
    try {
      return await this.persist(permittedModel, this.permittedModelRepository);
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      throw new DuplicatePermittedModelError(
        permittedModel.orgId,
        permittedModel.model.id,
      );
    }
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
      if (!isUniqueViolation(error)) throw error;
      throw new DuplicateTeamPermittedModelError(
        permittedModel.scopeId,
        permittedModel.model.id,
      );
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

  async update(permittedModel: PermittedModel): Promise<PermittedModel> {
    this.logger.log(
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
    this.logger.log({ catalogModelId }, 'findAllByCatalogModelId');

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
}
