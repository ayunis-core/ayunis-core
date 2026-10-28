import { Injectable, Logger } from '@nestjs/common';
import { UserDefaultModelRecord } from 'src/domain/models/infrastructure/persistence/local-user-default-models/schema/user-default-model.record';
import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';
import { UUID } from 'crypto';
import { PermittedModelMapper } from 'src/domain/models/infrastructure/persistence/local-permitted-models/mappers/permitted-model.mapper';

@Injectable()
export class UserDefaultModelMapper {
  private readonly logger = new Logger(UserDefaultModelMapper.name);

  constructor(private readonly permittedModelMapper: PermittedModelMapper) {}

  toDomain(entity: UserDefaultModelRecord): PermittedModel {
    this.logger.log(
      {
        userDefaultModelId: entity.id,
        userId: entity.userId,
        permittedModelId: entity.model.id,
      },
      'toDomain',
    );
    return this.permittedModelMapper.toDomain(entity.model);
  }

  toRecord(domain: PermittedModel, userId: UUID): UserDefaultModelRecord {
    const entity = new UserDefaultModelRecord();
    entity.id = domain.id;
    entity.model = this.permittedModelMapper.toRecord(domain);
    entity.userId = userId;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }
}
