import { PermittedModel } from '../../../../domain/permitted-model.entity';
import { PermittedModelRecord } from '../schema/permitted-model.record';
import { Model } from '../../../../domain/model.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PermittedModelMapper {
  toDomain(entity: PermittedModelRecord): PermittedModel {
    return new PermittedModel({
      id: entity.id,
      model: new Model(entity.name, entity.provider),
      orgId: entity.orgId,
      isDefault: entity.isDefault,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: PermittedModel): PermittedModelRecord {
    const entity = new PermittedModelRecord();
    entity.id = domain.id;
    entity.name = domain.model.name;
    entity.provider = domain.model.provider;
    entity.orgId = domain.orgId;
    entity.isDefault = domain.isDefault;
    return entity;
  }
}
