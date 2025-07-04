import { Injectable } from '@nestjs/common';
import { PermittedProviderRecord } from '../schema/permitted-provider.record';
import { PermittedProvider } from 'src/domain/models/domain/permitted-model-provider.entity';

@Injectable()
export class PermittedProviderMapper {
  toDomain(record: PermittedProviderRecord): PermittedProvider {
    return new PermittedProvider(record);
  }

  toRecord(entity: PermittedProvider): PermittedProviderRecord {
    const record = new PermittedProviderRecord();
    record.provider = entity.provider;
    record.orgId = entity.orgId;
    return record;
  }
}
