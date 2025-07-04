import { Injectable } from '@nestjs/common';
import { Model } from '../../../../domain/model.entity';
import { ModelConfig } from '../../../../domain/model-config.entity';
import { ModelWithConfig } from '../../../../domain/model-with-config.entity';
import { ModelRecord } from '../schema/model.record';

@Injectable()
export class ModelMapper {
  toDomain(record: ModelRecord): ModelWithConfig {
    const model = new Model({
      id: record.id,
      name: record.name,
      provider: record.provider,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
    const config = new ModelConfig({
      displayName: record.displayName,
      canStream: record.canStream,
      isReasoning: record.isReasoning,
      isArchived: record.isArchived,
    });

    return new ModelWithConfig(model, config);
  }

  toRecord(domain: ModelWithConfig): ModelRecord {
    const record = new ModelRecord();
    record.id = domain.model.id;
    record.name = domain.model.name;
    record.provider = domain.model.provider;
    record.createdAt = domain.model.createdAt;
    record.updatedAt = domain.model.updatedAt;
    record.displayName = domain.config.displayName;
    record.canStream = domain.config.canStream;
    record.isReasoning = domain.config.isReasoning;
    record.isArchived = domain.config.isArchived;
    return record;
  }
}
