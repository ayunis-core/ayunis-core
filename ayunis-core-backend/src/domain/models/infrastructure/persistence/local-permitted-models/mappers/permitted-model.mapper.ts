import { PermittedModel } from '../../../../domain/permitted-model.entity';
import { PermittedModelRecord } from '../schema/permitted-model.record';
import { Model } from '../../../../domain/model.entity';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PermittedModelMapper {
  private readonly logger = new Logger(PermittedModelMapper.name);

  toDomain(record: PermittedModelRecord): PermittedModel {
    this.logger.log('toDomain', { record });
    return new PermittedModel({
      id: record.id,
      model: new Model({
        id: record.model.id,
        name: record.model.name,
        provider: record.model.provider,
        createdAt: record.model.createdAt,
        updatedAt: record.model.updatedAt,
      }),
      orgId: record.orgId,
      isDefault: record.isDefault,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  toRecord(domain: PermittedModel): PermittedModelRecord {
    this.logger.log('toRecord', { domain });
    const record = new PermittedModelRecord();
    record.id = domain.id;
    record.modelId = domain.model.id;
    record.orgId = domain.orgId;
    record.isDefault = domain.isDefault;
    record.createdAt = domain.createdAt;
    record.updatedAt = domain.updatedAt;
    return record;
  }
}
