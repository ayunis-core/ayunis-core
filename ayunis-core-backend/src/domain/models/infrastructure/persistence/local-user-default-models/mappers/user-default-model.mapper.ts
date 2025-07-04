import { Injectable, Logger } from '@nestjs/common';
import { UserDefaultModelRecord } from '../schema/user-default-model.record';
import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';
import { UUID } from 'crypto';
import { PermittedModelMapper } from '../../local-permitted-models/mappers/permitted-model.mapper';

@Injectable()
export class UserDefaultModelMapper {
  private readonly logger = new Logger(UserDefaultModelMapper.name);

  constructor(private readonly permittedModelMapper: PermittedModelMapper) {}

  toDomain(entity: UserDefaultModelRecord): PermittedModel {
    this.logger.log('toDomain', { entity });
    return this.permittedModelMapper.toDomain(entity.model);
  }

  toEntity(domain: PermittedModel, userId: UUID): UserDefaultModelRecord {
    const entity = new UserDefaultModelRecord();
    entity.id = domain.id;
    entity.model = this.permittedModelMapper.toRecord(domain);
    entity.userId = userId;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }
}
