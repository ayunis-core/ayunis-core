import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UUID } from 'crypto';
import { UserDefaultModelsRepository } from 'src/domain/models/application/ports/user-default-models.repository';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { UserDefaultModelRecord } from './schema/user-default-model.record';
import { UserDefaultModelMapper } from './mappers/user-default-model.mapper';

@Injectable()
export class LocalUserDefaultModelsRepository extends UserDefaultModelsRepository {
  constructor(
    @InjectPinoLogger(LocalUserDefaultModelsRepository.name)
    private readonly logger: PinoLogger,

    @InjectRepository(UserDefaultModelRecord)
    private readonly userDefaultModelRepository: Repository<UserDefaultModelRecord>,
    private readonly userDefaultModelMapper: UserDefaultModelMapper,
  ) {
    super();
  }

  async findByUserId(userId: UUID): Promise<PermittedLanguageModel | null> {
    this.logger.info({ userId }, 'findByUserId');

    const userDefaultModel = await this.userDefaultModelRepository.findOne({
      where: { userId },
      relations: ['model'],
    });

    if (!userDefaultModel) {
      this.logger.debug({ userId }, 'No user default model found');
      return null;
    }

    this.logger.debug(
      {
        userId,
        model: userDefaultModel,
      },
      'User default model found',
    );

    return this.userDefaultModelMapper.toDomain(
      userDefaultModel,
    ) as PermittedLanguageModel;
  }

  async create(
    permittedModel: PermittedLanguageModel,
    userId: UUID,
  ): Promise<PermittedLanguageModel> {
    this.logger.info({ userId, modelId: permittedModel.id }, 'create');

    // First, delete any existing default model for this user
    await this.userDefaultModelRepository.delete({ userId });

    const userDefaultModelEntity = this.userDefaultModelMapper.toRecord(
      permittedModel,
      userId,
    );
    const savedEntity = await this.userDefaultModelRepository.save(
      userDefaultModelEntity,
    );

    this.logger.debug(
      {
        userId,
        modelId: savedEntity.model.id,
      },
      'User default model created',
    );

    return this.userDefaultModelMapper.toDomain(
      savedEntity,
    ) as PermittedLanguageModel;
  }

  async update(
    permittedModel: PermittedLanguageModel,
    userId: UUID,
  ): Promise<PermittedLanguageModel> {
    this.logger.info({ userId, modelId: permittedModel.id }, 'update');

    // Delete existing and create new (simpler than complex update logic)
    await this.userDefaultModelRepository.delete({ userId });

    const userDefaultModelEntity = this.userDefaultModelMapper.toRecord(
      permittedModel,
      userId,
    );
    const savedEntity = await this.userDefaultModelRepository.save(
      userDefaultModelEntity,
    );

    this.logger.debug(
      {
        userId,
        modelId: savedEntity.model.id,
      },
      'User default model updated',
    );

    return this.userDefaultModelMapper.toDomain(
      savedEntity,
    ) as PermittedLanguageModel;
  }

  async setAsDefault(
    permittedModel: PermittedLanguageModel,
    userId: UUID,
  ): Promise<PermittedLanguageModel> {
    this.logger.info({ userId, modelId: permittedModel.id }, 'setAsDefault');

    // Delete any existing default model for this user (handles both create and update)
    await this.userDefaultModelRepository.delete({ userId });

    const userDefaultModelRecord = this.userDefaultModelMapper.toRecord(
      permittedModel,
      userId,
    );
    this.logger.debug(
      {
        userDefaultModelRecord,
      },
      'userDefaultModelRecord save',
    );
    const savedEntity = await this.userDefaultModelRepository.save(
      userDefaultModelRecord,
    );

    // Reload the saved entity with its relations
    const reloadedEntity = await this.userDefaultModelRepository.findOne({
      where: { id: savedEntity.id },
      relations: ['model'],
    });

    if (!reloadedEntity) {
      throw new Error(
        `Failed to reload user default model with id ${savedEntity.id}`,
      );
    }

    this.logger.debug(
      {
        userId,
        modelId: reloadedEntity.model.id,
      },
      'User default model set as default',
    );

    return this.userDefaultModelMapper.toDomain(
      reloadedEntity,
    ) as PermittedLanguageModel;
  }

  async delete(
    permittedModel: PermittedLanguageModel,
    userId: UUID,
  ): Promise<void> {
    this.logger.info({ userId, modelId: permittedModel.id }, 'delete');

    const result = await this.userDefaultModelRepository.delete({
      userId,
      model: { id: permittedModel.id },
    });

    if (result.affected === 0) {
      this.logger.warn(
        {
          userId,
          modelId: permittedModel.id,
        },
        'No user default model found to delete',
      );
      throw new Error(
        `User default model with userId ${userId} and modelId ${permittedModel.id} not found`,
      );
    }

    this.logger.debug(
      {
        userId,
        modelId: permittedModel.id,
      },
      'User default model deleted',
    );
  }

  async deleteByModelId(modelId: UUID): Promise<void> {
    this.logger.info({ modelId }, 'deleteByModelId');
    const result = await this.userDefaultModelRepository.delete({
      model: { id: modelId },
    });
    this.logger.debug(
      {
        modelId,
        affected: result.affected,
      },
      'Deleted user default models by model id',
    );
  }

  async deleteByPermittedModelIds(permittedModelIds: UUID[]): Promise<void> {
    if (permittedModelIds.length === 0) {
      this.logger.debug('deleteByPermittedModelIds called with empty array');
      return;
    }

    this.logger.info(
      {
        count: permittedModelIds.length,
      },
      'deleteByPermittedModelIds',
    );

    const result = await this.userDefaultModelRepository.delete({
      model: { id: In(permittedModelIds) },
    });

    this.logger.debug(
      {
        affected: result.affected,
        permittedModelIds,
      },
      'Deleted user default models by permitted model ids',
    );
  }
}
