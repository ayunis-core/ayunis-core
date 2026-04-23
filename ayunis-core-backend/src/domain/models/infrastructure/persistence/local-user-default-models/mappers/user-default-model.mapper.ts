import { Injectable, Logger } from '@nestjs/common';
import { UserDefaultModelRecord } from '../schema/user-default-model.record';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { UUID } from 'crypto';
import { ModelMapper } from '../../local-models/mappers/model.mapper';
import { LanguageModelRecord } from '../../local-models/schema/model.record';

@Injectable()
export class UserDefaultModelMapper {
  private readonly logger = new Logger(UserDefaultModelMapper.name);

  constructor(private readonly modelMapper: ModelMapper) {}

  toDomain(entity: UserDefaultModelRecord): LanguageModel {
    this.logger.log('toDomain', { entity });
    return this.modelMapper.toDomain(entity.model) as LanguageModel;
  }

  toRecord(model: LanguageModel, userId: UUID): UserDefaultModelRecord {
    const entity = new UserDefaultModelRecord();
    entity.model = this.modelMapper.toRecord(model) as LanguageModelRecord;
    entity.modelId = model.id;
    entity.userId = userId;
    return entity;
  }
}
