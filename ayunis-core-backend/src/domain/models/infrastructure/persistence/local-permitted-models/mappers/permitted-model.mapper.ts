import { PermittedModel } from '../../../../domain/permitted-model.entity';
import { PermittedModelRecord } from '../schema/permitted-model.record';
import { Model } from '../../../../domain/model.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PermittedModelMapper {
  toDomain(record: PermittedModelRecord): PermittedModel {
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
