import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import {
  FindOneModelParams,
  ModelsRepository,
} from '../../../application/ports/models.repository';
import { Model } from '../../../domain/model.entity';
import {
  EmbeddingModelRecord,
  LanguageModelRecord,
  ModelRecord,
} from './schema/model.record';
import { ModelMapper } from './mappers/model.mapper';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { EmbeddingModel } from 'src/domain/models/domain/models/embedding.model';

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

  async findAll(): Promise<Model[]> {
    this.logger.log('findAll');

    const modelRecords = await this.localModelRepository.find();

    return modelRecords.map((modelRecord) =>
      this.localModelMapper.toDomain(modelRecord),
    );
  }

  async findOne(params: FindOneModelParams): Promise<Model | undefined> {
    this.logger.log('findOne', params);

    const where =
      'id' in params
        ? { id: params.id }
        : { name: params.name, provider: params.provider };

    const model = await this.localModelRepository.findOne({ where });

    return model ? this.localModelMapper.toDomain(model) : undefined;
  }

  async findOneLanguage(id: UUID): Promise<LanguageModel | undefined> {
    const model = await this.localModelRepository.findOneBy({
      id,
    });
    if (!model || !(model instanceof LanguageModelRecord)) {
      return undefined;
    }
    return this.localModelMapper.toDomain(model) as LanguageModel;
  }

  async findOneEmbedding(id: UUID): Promise<EmbeddingModel | undefined> {
    const model = await this.localModelRepository.findOneBy({
      id,
    });
    if (!model || !(model instanceof EmbeddingModelRecord)) {
      return undefined;
    }
    return this.localModelMapper.toDomain(model) as EmbeddingModel;
  }

  async save(model: Model): Promise<void> {
    this.logger.log('save', {
      modelName: model.name,
      modelProvider: model.provider,
      displayName: model.displayName,
    });

    const modelEntity = this.localModelMapper.toRecord(model);
    await this.localModelRepository.save(modelEntity);
  }

  async update<T extends Model>(id: UUID, model: T): Promise<T> {
    this.logger.log('update', {
      id,
      modelName: model.name,
      modelProvider: model.provider,
      displayName: model.displayName,
    });

    const modelEntity = this.localModelMapper.toRecord(model);
    modelEntity.id = id;

    const savedModel = await this.localModelRepository.save(modelEntity);

    // Type assertion: we know the mapper will return the same concrete type
    return this.localModelMapper.toDomain(savedModel) as T;
  }

  async delete(id: UUID): Promise<void> {
    this.logger.log('delete', { id });

    const result = await this.localModelRepository.delete({ id });

    if (result.affected === 0) {
      throw new Error(`Model with id ${id} not found`);
    }
  }
}
