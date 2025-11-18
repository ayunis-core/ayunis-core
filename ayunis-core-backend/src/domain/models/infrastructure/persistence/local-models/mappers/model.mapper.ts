import { Injectable } from '@nestjs/common';
import { Model } from '../../../../domain/model.entity';
import { LanguageModel } from '../../../../domain/models/language.model';
import { EmbeddingModel } from '../../../../domain/models/embedding.model';
import {
  ModelRecord,
  LanguageModelRecord,
  EmbeddingModelRecord,
} from '../schema/model.record';

@Injectable()
export class ModelMapper {
  toDomain(record: ModelRecord): Model {
    // TypeORM will provide the concrete record type based on the discriminator
    if (record instanceof LanguageModelRecord) {
      return new LanguageModel({
        id: record.id,
        name: record.name,
        provider: record.provider,
        displayName: record.displayName,
        canStream: record.canStream,
        canUseTools: record.canUseTools,
        isReasoning: record.isReasoning,
        canVision: record.canVision,
        isArchived: record.isArchived,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      });
    }

    if (record instanceof EmbeddingModelRecord) {
      return new EmbeddingModel({
        id: record.id,
        name: record.name,
        provider: record.provider,
        displayName: record.displayName,
        dimensions: record.dimensions,
        isArchived: record.isArchived,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      });
    }

    throw new Error(`Unknown model record type: ${record.constructor.name}`);
  }

  toRecord(domain: Model): ModelRecord {
    if (domain instanceof LanguageModel) {
      const record = new LanguageModelRecord();
      record.id = domain.id;
      record.name = domain.name;
      record.provider = domain.provider;
      record.displayName = domain.displayName;
      record.canStream = domain.canStream;
      record.canUseTools = domain.canUseTools;
      record.isReasoning = domain.isReasoning;
      record.canVision = domain.canVision;
      record.isArchived = domain.isArchived;
      record.createdAt = domain.createdAt;
      record.updatedAt = domain.updatedAt;
      return record;
    }

    if (domain instanceof EmbeddingModel) {
      const record = new EmbeddingModelRecord();
      record.id = domain.id;
      record.name = domain.name;
      record.provider = domain.provider;
      record.displayName = domain.displayName;
      record.dimensions = domain.dimensions;
      record.isArchived = domain.isArchived;
      record.createdAt = domain.createdAt;
      record.updatedAt = domain.updatedAt;
      return record;
    }

    throw new Error(`Unknown model domain type: ${domain.constructor.name}`);
  }
}
