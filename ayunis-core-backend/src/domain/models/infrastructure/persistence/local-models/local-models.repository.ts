import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import {
  FindOneModelParams,
  ModelsRepository,
} from 'src/domain/models/application/ports/models.repository';
import { Model } from 'src/domain/models/domain/model.entity';
import {
  EmbeddingModelRecord,
  ImageGenerationModelRecord,
  LanguageModelRecord,
  ModelRecord,
} from './schema/model.record';
import { ModelMapper } from './mappers/model.mapper';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { EmbeddingModel } from 'src/domain/models/domain/models/embedding.model';
import { ImageGenerationModel } from 'src/domain/models/domain/models/image-generation.model';
import {
  ModelAlreadyExistsError,
  ModelReferencedByUsageError,
} from 'src/domain/models/application/models.errors';

const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';
const MODEL_KEY_UNIQUE_CONSTRAINT = 'IDX_7c11834d93fa8eaf208a48d66a';
const USAGE_MODEL_FOREIGN_KEY = 'FK_523206731b52aa6170a99d10bbf';

function isConstraintViolation(
  error: unknown,
  code: string,
  constraint: string,
): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const record = error as Record<string, unknown>;
  const driverError = record.driverError as Record<string, unknown> | undefined;
  return (
    (driverError?.code ?? record.code) === code &&
    (driverError?.constraint ?? record.constraint) === constraint
  );
}

function isModelKeyUniqueConstraintViolation(error: unknown): boolean {
  return isConstraintViolation(
    error,
    PG_UNIQUE_VIOLATION,
    MODEL_KEY_UNIQUE_CONSTRAINT,
  );
}

function isUsageModelForeignKeyViolation(error: unknown): boolean {
  return isConstraintViolation(
    error,
    PG_FOREIGN_KEY_VIOLATION,
    USAGE_MODEL_FOREIGN_KEY,
  );
}

@Injectable()
export class LocalModelsRepository extends ModelsRepository {
  private readonly logger = new Logger(LocalModelsRepository.name);

  constructor(
    @InjectRepository(ModelRecord)
    private readonly localModelRepository: Repository<ModelRecord>,
    private readonly localModelMapper: ModelMapper,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
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

  async withCatalogModelLocked<Result>(
    id: UUID,
    operation: (model: Model | undefined) => Promise<Result>,
  ): Promise<Result> {
    this.logger.log('withCatalogModelLocked', { id });

    return await this.txHost.withTransaction(async () => {
      const record = await this.txHost.tx.findOne(ModelRecord, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      const model = record ? this.localModelMapper.toDomain(record) : undefined;
      return await operation(model);
    });
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

  async findOneImageGeneration(
    id: UUID,
  ): Promise<ImageGenerationModel | undefined> {
    const model = await this.localModelRepository.findOneBy({
      id,
    });
    if (!model || !(model instanceof ImageGenerationModelRecord)) {
      return undefined;
    }
    return this.localModelMapper.toDomain(model);
  }

  async save(model: Model): Promise<void> {
    this.logger.log('save', {
      modelName: model.name,
      modelProvider: model.provider,
      displayName: model.displayName,
    });

    const modelEntity = this.localModelMapper.toRecord(model);
    try {
      await this.localModelRepository.save(modelEntity);
    } catch (error) {
      if (isModelKeyUniqueConstraintViolation(error)) {
        throw new ModelAlreadyExistsError(model.name, model.provider);
      }
      throw error;
    }
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

    try {
      const result = await this.txHost.tx.delete(ModelRecord, { id });
      if (result.affected === 0) {
        throw new Error(`Model with id ${id} not found`);
      }
    } catch (error) {
      if (isUsageModelForeignKeyViolation(error)) {
        throw new ModelReferencedByUsageError(id);
      }
      throw error;
    }
  }
}
