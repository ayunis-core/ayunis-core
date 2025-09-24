import { Injectable } from '@nestjs/common';
import { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import { SourceContentChunkRecord } from '../schema/source-content-chunk.record';
import { TextSourceDetailsRecord } from '../schema/text-source-details.record';

@Injectable()
export class SourceContentChunkMapper {
  toRecord(
    parent: TextSourceDetailsRecord,
    sourceContentChunk: TextSourceContentChunk,
  ): SourceContentChunkRecord {
    const record = new SourceContentChunkRecord();
    record.id = sourceContentChunk.id;
    record.source = parent;
    record.content = sourceContentChunk.content;
    record.meta = sourceContentChunk.meta;
    record.createdAt = sourceContentChunk.createdAt;
    record.updatedAt = sourceContentChunk.updatedAt;
    return record;
  }

  toDomain(entity: SourceContentChunkRecord): TextSourceContentChunk {
    return new TextSourceContentChunk({
      id: entity.id,
      content: entity.content,
      meta: entity.meta || {},
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
