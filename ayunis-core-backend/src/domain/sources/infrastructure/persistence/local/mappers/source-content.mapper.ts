import { Injectable } from '@nestjs/common';
import { TextSourceContentChunk } from 'src/domain/sources/domain/source-content.entity';
import { SourceContentChunkRecord } from '../schema/source-content.record';

@Injectable()
export class SourceContentMapper {
  toEntity(sourceContent: TextSourceContentChunk): SourceContentChunkRecord {
    const entity = new SourceContentChunkRecord();
    entity.id = sourceContent.id;
    entity.content = sourceContent.content;
    entity.sourceId = sourceContent.sourceId;
    entity.meta = sourceContent.meta;
    entity.createdAt = sourceContent.createdAt;
    entity.updatedAt = sourceContent.updatedAt;
    return entity;
  }

  toDomain(entity: SourceContentChunkRecord): TextSourceContentChunk {
    return new TextSourceContentChunk({
      id: entity.id,
      sourceId: entity.sourceId,
      content: entity.content,
      meta: entity.meta || {},
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
