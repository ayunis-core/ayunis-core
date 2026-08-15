import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UserDefaultModelRecord } from '../schema/user-default-model.record';
import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';
import { UUID } from 'crypto';
import { PermittedModelMapper } from '../../local-permitted-models/mappers/permitted-model.mapper';

@Injectable()
export class UserDefaultModelMapper {
  constructor(
    @InjectPinoLogger(UserDefaultModelMapper.name)
    private readonly logger: PinoLogger,
    private readonly permittedModelMapper: PermittedModelMapper,
  ) {}

  toDomain(entity: UserDefaultModelRecord): PermittedModel {
    this.logger.info(
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
