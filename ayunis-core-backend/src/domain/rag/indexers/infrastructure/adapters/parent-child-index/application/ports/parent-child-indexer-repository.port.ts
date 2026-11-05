import { Injectable } from '@nestjs/common';
import { ParentChunk } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/domain/parent-chunk.entity';
import { UUID } from 'crypto';

export interface ScoredParentChunk {
  parentChunk: ParentChunk;
  /** Cosine distance of the closest child chunk; lower is more similar. */
  distance: number;
}

@Injectable()
export abstract class ParentChildIndexerRepositoryPort {
  abstract save(input: ParentChunk): Promise<void>;
  abstract saveMany(inputs: ParentChunk[]): Promise<void>;
  abstract delete(relatedDocumentId: UUID): Promise<void>;
  abstract deleteMany(relatedDocumentIds: UUID[]): Promise<void>;
  abstract findByDocumentIds(
    queryVector: number[],
    relatedDocumentIds: UUID[],
    limit?: number,
  ): Promise<ScoredParentChunk[]>;
}
