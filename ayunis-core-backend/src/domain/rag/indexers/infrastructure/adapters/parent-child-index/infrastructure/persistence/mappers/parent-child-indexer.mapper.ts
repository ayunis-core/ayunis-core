import { Injectable } from '@nestjs/common';
import { ParentChunkRecord } from '../schema/parent-chunk.record';
import { ChildChunkRecord } from '../schema/child-chunk.record';
import { ParentChunk } from '../../../domain/parent-chunk.entity';
import { ChildChunk } from '../../../domain/child-chunk.entity';

@Injectable()
export class ParentChildIndexerMapper {
  toParentChunkRecord(parentChunk: ParentChunk): ParentChunkRecord {
    const parentChunkRecord = new ParentChunkRecord();
    parentChunkRecord.id = parentChunk.id;
    parentChunkRecord.relatedDocumentId = parentChunk.relatedDocumentId;
    parentChunkRecord.relatedChunkId = parentChunk.relatedChunkId;
    parentChunkRecord.content = parentChunk.content;
    parentChunkRecord.children = parentChunk.children.map((child) =>
      this.toChildChunkRecord(child),
    );
    parentChunkRecord.createdAt = parentChunk.createdAt;
    parentChunkRecord.updatedAt = parentChunk.updatedAt;
    return parentChunkRecord;
  }

  toChildChunkRecord(childChunk: ChildChunk): ChildChunkRecord {
    const childChunkRecord = new ChildChunkRecord();
    childChunkRecord.id = childChunk.id;
    // Route to the correct column by dimension
    if (Array.isArray(childChunk.embedding)) {
      const len = childChunk.embedding.length;
      if (len === 1024) {
        childChunkRecord.embedding1024 = childChunk.embedding;
        childChunkRecord.embedding1536 = null;
        childChunkRecord.embedding2560 = null;
      } else if (len === 1536) {
        childChunkRecord.embedding1024 = null;
        childChunkRecord.embedding1536 = childChunk.embedding;
        childChunkRecord.embedding2560 = null;
      } else if (len === 2560) {
        childChunkRecord.embedding1024 = null;
        childChunkRecord.embedding1536 = null;
        childChunkRecord.embedding2560 = childChunk.embedding;
      } else {
        // Unknown dimension: do not write into any column
        childChunkRecord.embedding1024 = null;
        childChunkRecord.embedding1536 = null;
        childChunkRecord.embedding2560 = null;
      }
    }
    childChunkRecord.parentId = childChunk.parentId;
    return childChunkRecord;
  }

  toParentChunkEntity(input: ParentChunkRecord): ParentChunk {
    const parentChunk = new ParentChunk({
      id: input.id,
      relatedDocumentId: input.relatedDocumentId,
      relatedChunkId: input.relatedChunkId,
      content: input.content,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
      children: input.children.map((child) => this.toChildChunkEntity(child)),
    });
    return parentChunk;
  }

  toChildChunkEntity(input: ChildChunkRecord): ChildChunk {
    // Prefer 1536 if present, otherwise 1024
    const embedding =
      (input.embedding1536 as unknown as number[]) ||
      (input.embedding1024 as unknown as number[]) ||
      [];
    return new ChildChunk({
      id: input.id,
      embedding,
      parentId: input.parentId,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
    });
  }
}
