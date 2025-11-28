import {
  PermittedEmbeddingModel,
  PermittedLanguageModel,
  PermittedModel,
} from '../../../../domain/permitted-model.entity';
import { PermittedModelRecord } from '../schema/permitted-model.record';
import { Injectable } from '@nestjs/common';
import { ModelMapper } from '../../local-models/mappers/model.mapper';
import {
  EmbeddingModelRecord,
  LanguageModelRecord,
} from '../../local-models/schema/model.record';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { EmbeddingModel } from 'src/domain/models/domain/models/embedding.model';

@Injectable()
export class PermittedModelMapper {
  constructor(private readonly modelMapper: ModelMapper) {}

  toDomain(record: PermittedModelRecord): PermittedModel {
    if (record.model instanceof LanguageModelRecord) {
      return new PermittedLanguageModel({
        id: record.id,
        model: this.modelMapper.toDomain(record.model) as LanguageModel,
        orgId: record.orgId,
        isDefault: record.isDefault,
        anonymousOnly: record.anonymousOnly,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      });
    }
    if (record.model instanceof EmbeddingModelRecord) {
      return new PermittedEmbeddingModel({
        id: record.id,
        model: this.modelMapper.toDomain(record.model) as EmbeddingModel,
        orgId: record.orgId,
        isDefault: record.isDefault,
        anonymousOnly: record.anonymousOnly,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      });
    }
    throw new Error('Unknown model record type');
  }

  toRecord(domain: PermittedModel): PermittedModelRecord {
    const record = new PermittedModelRecord();
    record.id = domain.id;
    record.modelId = domain.model.id;
    record.model = this.modelMapper.toRecord(domain.model);
    record.orgId = domain.orgId;
    record.isDefault = domain.isDefault;
    record.anonymousOnly = domain.anonymousOnly;
    record.createdAt = domain.createdAt;
    record.updatedAt = domain.updatedAt;
    return record;
  }
}
