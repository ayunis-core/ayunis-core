import { ToolConfig } from 'src/domain/tools/domain/tool-config.entity';
import { ToolConfigRecord } from '../schema/tool-config.record';
import { HttpToolConfigRecord } from '../schema/http-tool-config.record';
import { HttpToolConfig } from 'src/domain/tools/domain/tools/http-tool.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ToolConfigMapper {
  toDomain(record: ToolConfigRecord): ToolConfig {
    if (record instanceof HttpToolConfigRecord) {
      return this.httpToolConfigToDomain(record);
    }

    throw new Error('Invalid tool config type: ' + record.constructor.name);
  }

  toRecord(domain: ToolConfig): ToolConfigRecord {
    if (domain instanceof HttpToolConfig) {
      return this.httpToolConfigToEntity(domain);
    }

    throw new Error('Invalid tool config type: ' + domain.constructor.name);
  }

  private httpToolConfigToDomain(entity: HttpToolConfigRecord): HttpToolConfig {
    return new HttpToolConfig({
      id: entity.id,
      displayName: entity.displayName,
      description: entity.description,
      userId: entity.userId,
      endpointUrl: entity.endpointUrl,
      method: entity.method,
    });
  }

  private httpToolConfigToEntity(domain: HttpToolConfig): HttpToolConfigRecord {
    const entity = new HttpToolConfigRecord();
    entity.id = domain.id;
    entity.displayName = domain.displayName;
    entity.description = domain.description;
    entity.userId = domain.userId;
    entity.endpointUrl = domain.endpointUrl;
    entity.method = domain.method;
    return entity;
  }
}
