import { PermittedModel } from '../../../../domain/permitted-model.entity';
import { PermittedModelRecord } from '../schema/permitted-model.record';
import { Injectable } from '@nestjs/common';
import { ModelMapper } from '../../local-models/mappers/model.mapper';

@Injectable()
export class PermittedModelMapper {
  constructor(private readonly modelMapper: ModelMapper) {}

  toDomain(record: PermittedModelRecord): PermittedModel {
    return new PermittedModel({
      id: record.id,
      model: this.modelMapper.toDomain(record.model),
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
    record.model = this.modelMapper.toRecord(domain.model);
    record.orgId = domain.orgId;
    record.isDefault = domain.isDefault;
    record.createdAt = domain.createdAt;
    record.updatedAt = domain.updatedAt;
    return record;
  }
}
