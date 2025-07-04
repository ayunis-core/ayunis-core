import { Injectable } from '@nestjs/common';
import { Model } from '../../../../domain/model.entity';
import { ModelConfig } from '../../../../domain/model-config.entity';
import { ModelWithConfig } from '../../../../domain/model-with-config.entity';
import { LocalModelRecord } from '../schema/local-model.record';

@Injectable()
export class LocalModelMapper {
  toDomain(entity: LocalModelRecord): ModelWithConfig {
    const model = new Model(entity.name, entity.provider);
    const config = new ModelConfig({
      displayName: entity.displayName,
      canStream: entity.canStream,
      isReasoning: entity.isReasoning,
      isArchived: entity.isArchived,
    });

    return new ModelWithConfig(model, config);
  }

  toEntity(domain: ModelWithConfig): LocalModelRecord {
    const entity = new LocalModelRecord();
    entity.name = domain.model.name;
    entity.provider = domain.model.provider;
    entity.displayName = domain.config.displayName;
    entity.canStream = domain.config.canStream;
    entity.isReasoning = domain.config.isReasoning;
    entity.isArchived = domain.config.isArchived;
    return entity;
  }
}
