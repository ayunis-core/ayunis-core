import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import {
  FindOneModelParams,
  ModelsRepository,
} from '../../../application/ports/models.repository';
import { ModelWithConfig } from '../../../domain/model-with-config.entity';
import { ModelRecord } from './schema/model.record';
import { ModelMapper } from './mappers/model.mapper';

@Injectable()
export class LocalModelsRepository extends ModelsRepository {
  private readonly logger = new Logger(LocalModelsRepository.name);

  constructor(
    @InjectRepository(ModelRecord)
    private readonly localModelRepository: Repository<ModelRecord>,
    private readonly localModelMapper: ModelMapper,
  ) {
    super();
  }

  async findAll(): Promise<ModelWithConfig[]> {
    this.logger.log('findAll');

    const modelRecords = await this.localModelRepository.find();

    return modelRecords.map((modelRecord) =>
      this.localModelMapper.toDomain(modelRecord),
    );
  }

  async findOne(
    params: FindOneModelParams,
  ): Promise<ModelWithConfig | undefined> {
    this.logger.log('findOne', params);

    const where =
      'id' in params
        ? { id: params.id }
        : { name: params.name, provider: params.provider };

    const model = await this.localModelRepository.findOne({ where });

    return model ? this.localModelMapper.toDomain(model) : undefined;
  }

  async create(model: ModelWithConfig): Promise<ModelWithConfig> {
    this.logger.log('create', {
      modelName: model.model.name,
      modelProvider: model.model.provider,
      displayName: model.config.displayName,
    });

    const modelEntity = this.localModelMapper.toRecord(model);
    const savedModel = await this.localModelRepository.save(modelEntity);

    return this.localModelMapper.toDomain(savedModel);
  }

  async update(id: UUID, model: ModelWithConfig): Promise<ModelWithConfig> {
    this.logger.log('update', {
      id,
      modelName: model.model.name,
      modelProvider: model.model.provider,
      displayName: model.config.displayName,
    });

    const modelEntity = this.localModelMapper.toRecord(model);
    modelEntity.id = id;

    const savedModel = await this.localModelRepository.save(modelEntity);

    return this.localModelMapper.toDomain(savedModel);
  }

  async delete(id: UUID): Promise<void> {
    this.logger.log('delete', { id });

    const result = await this.localModelRepository.delete({ id });

    if (result.affected === 0) {
      throw new Error(`Model with id ${id} not found`);
    }
  }
}
