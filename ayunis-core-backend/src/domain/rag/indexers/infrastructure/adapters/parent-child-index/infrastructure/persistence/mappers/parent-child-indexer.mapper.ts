import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ParentChunkRecord } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/infrastructure/persistence/schema/parent-chunk.record';
import { ChildChunkRecord } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/infrastructure/persistence/schema/child-chunk.record';
import { ParentChunk } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/domain/parent-chunk.entity';
import { ChildChunk } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/domain/child-chunk.entity';

@Injectable()
export class ParentChildIndexerMapper {
  toParentChunkRecord(parentChunk: ParentChunk): ParentChunkRecord {
    const parentChunkRecord = new ParentChunkRecord();
    parentChunkRecord.id = parentChunk.id;
    parentChunkRecord.relatedDocumentId = parentChunk.relatedDocumentId;
    parentChunkRecord.relatedChunkId = parentChunk.relatedChunkId;
    parentChunkRecord.content = parentChunk.content;
    parentChunkRecord.children = parentChunk.children.map((child) =>
      this.toChildChunkRecord(child, parentChunk.relatedDocumentId),
    );
    parentChunkRecord.createdAt = parentChunk.createdAt;
    parentChunkRecord.updatedAt = parentChunk.updatedAt;
    return parentChunkRecord;
  }

  toChildChunkRecord(
    childChunk: ChildChunk,
    relatedDocumentId: UUID,
  ): ChildChunkRecord {
    const childChunkRecord = new ChildChunkRecord();
    childChunkRecord.id = childChunk.id;
    childChunkRecord.relatedDocumentId = relatedDocumentId;
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
    const embedding =
      input.embedding1536 ?? input.embedding1024 ?? input.embedding2560 ?? [];
    return new ChildChunk({
      id: input.id,
      embedding,
      parentId: input.parentId,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
    });
  }
}
