import { Injectable } from '@nestjs/common';
import { Model } from '../../../../domain/model.entity';
import { ModelRecord } from '../schema/model.record';

@Injectable()
export class ModelMapper {
  toDomain(record: ModelRecord): Model {
    const model = new Model({
      id: record.id,
      name: record.name,
      provider: record.provider,
      displayName: record.displayName,
      canStream: record.canStream,
      isReasoning: record.isReasoning,
      isArchived: record.isArchived,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });

    return model;
  }

  toRecord(domain: Model): ModelRecord {
    const record = new ModelRecord();
    record.id = domain.id;
    record.name = domain.name;
    record.provider = domain.provider;
    record.displayName = domain.displayName;
    record.canStream = domain.canStream;
    record.isReasoning = domain.isReasoning;
    record.isArchived = domain.isArchived;
    record.createdAt = domain.createdAt;
    record.updatedAt = domain.updatedAt;
    return record;
  }
}
