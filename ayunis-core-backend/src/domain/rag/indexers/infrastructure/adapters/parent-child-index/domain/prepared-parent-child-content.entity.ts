import type { UUID } from 'crypto';
import { PreparedIndexContent } from 'src/domain/rag/indexers/domain/prepared-index-content.entity';
import { IndexType } from 'src/domain/rag/indexers/domain/value-objects/index-type.enum';
import type { ParentChunk } from './parent-chunk.entity';

export class PreparedParentChildContent extends PreparedIndexContent {
  constructor(
    documentId: UUID,
    public readonly parentChunks: ParentChunk[],
  ) {
    super(IndexType.PARENT_CHILD, documentId);
  }
}
