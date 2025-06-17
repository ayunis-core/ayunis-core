import { Injectable } from '@nestjs/common';
import { SourceContent } from 'src/domain/sources/domain/source-content.entity';
import { SourceContentRecord } from '../schema/source-content.record';

@Injectable()
export class SourceContentMapper {
  toEntity(sourceContent: SourceContent): SourceContentRecord {
    const entity = new SourceContentRecord();
    entity.id = sourceContent.id;
    entity.content = sourceContent.content;
    entity.sourceId = sourceContent.sourceId;
    return entity;
  }

  toDomain(entity: SourceContentRecord): SourceContent {
    return new SourceContent({
      id: entity.id,
      sourceId: entity.sourceId,
      content: entity.content,
      meta: {},
    });
  }
}
