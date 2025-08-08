import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { UserDefaultModelsRepository } from '../../../application/ports/user-default-models.repository';
import { PermittedLanguageModel } from '../../../domain/permitted-model.entity';
import { UserDefaultModelRecord } from './schema/user-default-model.record';
import { UserDefaultModelMapper } from './mappers/user-default-model.mapper';

@Injectable()
export class LocalUserDefaultModelsRepository extends UserDefaultModelsRepository {
  private readonly logger = new Logger(LocalUserDefaultModelsRepository.name);

  constructor(
    @InjectRepository(UserDefaultModelRecord)
    private readonly userDefaultModelRepository: Repository<UserDefaultModelRecord>,
    private readonly userDefaultModelMapper: UserDefaultModelMapper,
  ) {
    super();
  }

  async findByUserId(userId: UUID): Promise<PermittedLanguageModel | null> {
    this.logger.log('findByUserId', { userId });

    const userDefaultModel = await this.userDefaultModelRepository.findOne({
      where: { userId },
      relations: ['model'],
    });

    if (!userDefaultModel) {
      this.logger.debug('No user default model found', { userId });
      return null;
    }

    this.logger.debug('User default model found', {
      userId,
      model: userDefaultModel,
    });

    return this.userDefaultModelMapper.toDomain(
      userDefaultModel,
    ) as PermittedLanguageModel;
  }

  async create(
    permittedModel: PermittedLanguageModel,
    userId: UUID,
  ): Promise<PermittedLanguageModel> {
    this.logger.log('create', { userId, modelId: permittedModel.id });

    // First, delete any existing default model for this user
    await this.userDefaultModelRepository.delete({ userId });

    const userDefaultModelEntity = this.userDefaultModelMapper.toRecord(
      permittedModel,
      userId,
    );
    const savedEntity = await this.userDefaultModelRepository.save(
      userDefaultModelEntity,
    );

    this.logger.debug('User default model created', {
      userId,
      modelId: savedEntity.model.id,
    });

    return this.userDefaultModelMapper.toDomain(
      savedEntity,
    ) as PermittedLanguageModel;
  }

  async update(
    permittedModel: PermittedLanguageModel,
    userId: UUID,
  ): Promise<PermittedLanguageModel> {
    this.logger.log('update', { userId, modelId: permittedModel.id });

    // Delete existing and create new (simpler than complex update logic)
    await this.userDefaultModelRepository.delete({ userId });

    const userDefaultModelEntity = this.userDefaultModelMapper.toRecord(
      permittedModel,
      userId,
    );
    const savedEntity = await this.userDefaultModelRepository.save(
      userDefaultModelEntity,
    );

    this.logger.debug('User default model updated', {
      userId,
      modelId: savedEntity.model.id,
    });

    return this.userDefaultModelMapper.toDomain(
      savedEntity,
    ) as PermittedLanguageModel;
  }

  async setAsDefault(
    permittedModel: PermittedLanguageModel,
    userId: UUID,
  ): Promise<PermittedLanguageModel> {
    this.logger.log('setAsDefault', { userId, modelId: permittedModel.id });

    // Delete any existing default model for this user (handles both create and update)
    await this.userDefaultModelRepository.delete({ userId });

    const userDefaultModelRecord = this.userDefaultModelMapper.toRecord(
      permittedModel,
      userId,
    );
    this.logger.debug('userDefaultModelRecord save', {
      userDefaultModelRecord,
    });
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

    this.logger.debug('User default model set as default', {
      userId,
      modelId: reloadedEntity.model.id,
    });

    return this.userDefaultModelMapper.toDomain(
      reloadedEntity,
    ) as PermittedLanguageModel;
  }

  async delete(
    permittedModel: PermittedLanguageModel,
    userId: UUID,
  ): Promise<void> {
    this.logger.log('delete', { userId, modelId: permittedModel.id });

    const result = await this.userDefaultModelRepository.delete({
      userId,
      model: { id: permittedModel.id },
    });

    if (result.affected === 0) {
      this.logger.warn('No user default model found to delete', {
        userId,
        modelId: permittedModel.id,
      });
      throw new Error(
        `User default model with userId ${userId} and modelId ${permittedModel.id} not found`,
      );
    }

    this.logger.debug('User default model deleted', {
      userId,
      modelId: permittedModel.id,
    });
  }

  async deleteByModelId(modelId: UUID): Promise<void> {
    this.logger.log('deleteByModelId', { modelId });
    const result = await this.userDefaultModelRepository.delete({
      model: { id: modelId },
    });
    this.logger.debug('Deleted user default models by model id', {
      modelId,
      affected: result.affected,
    });
  }
}
