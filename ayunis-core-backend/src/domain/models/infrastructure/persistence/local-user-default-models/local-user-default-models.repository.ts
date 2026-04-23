import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { UserDefaultModelsRepository } from '../../../application/ports/user-default-models.repository';
import { LanguageModel } from '../../../domain/models/language.model';
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

  async findByUserId(userId: UUID): Promise<LanguageModel | null> {
    this.logger.log('findByUserId', { userId });

    const record = await this.userDefaultModelRepository.findOne({
      where: { userId },
      relations: ['model'],
    });

    if (!record) {
      this.logger.debug('No user default model found', { userId });
      return null;
    }

    return this.userDefaultModelMapper.toDomain(record);
  }

  async setAsDefault(
    model: LanguageModel,
    userId: UUID,
  ): Promise<LanguageModel> {
    this.logger.log('setAsDefault', { userId, modelId: model.id });

    // Delete-and-insert so we don't have to reason about whether a row exists
    // for this user; the unique index on userId guarantees at most one row.
    await this.userDefaultModelRepository.delete({ userId });

    const record = this.userDefaultModelMapper.toRecord(model, userId);
    await this.userDefaultModelRepository.save(record);

    return model;
  }

  async deleteByUserId(userId: UUID): Promise<void> {
    this.logger.log('deleteByUserId', { userId });
    await this.userDefaultModelRepository.delete({ userId });
  }
}
