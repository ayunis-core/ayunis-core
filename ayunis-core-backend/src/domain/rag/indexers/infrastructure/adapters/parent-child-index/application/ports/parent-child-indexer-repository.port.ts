import { Injectable } from '@nestjs/common';
import { ParentChunk } from '../../domain/parent-chunk.entity';
import { UUID } from 'crypto';

@Injectable()
export abstract class ParentChildIndexerRepositoryPort {
  abstract save(input: ParentChunk): Promise<void>;
  abstract delete(relatedDocumentId: UUID): Promise<void>;
  abstract deleteMany(relatedDocumentIds: UUID[]): Promise<void>;
  abstract find(
    queryVector: number[],
    relatedDocumentId: UUID,
  ): Promise<ParentChunk[]>;
}
