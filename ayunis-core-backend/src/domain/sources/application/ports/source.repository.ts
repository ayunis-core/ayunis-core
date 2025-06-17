import { UUID } from 'crypto';
import { Source } from '../../domain/source.entity';
import { FileSource } from '../../domain/sources/file-source.entity';
import { UrlSource } from '../../domain/sources/url-source.entity';
import { SourceContentChunk } from '../../domain/source-content-chunk.entity';
import { SourceContent } from '../../domain/source-content.entity';

export const SOURCE_REPOSITORY = Symbol('SOURCE_REPOSITORY');

export abstract class SourceRepository {
  abstract findById(id: UUID): Promise<Source | null>;
  abstract findAllByThreadId(threadId: UUID): Promise<Source[]>;
  abstract findAllByUserId(userId: UUID): Promise<Source[]>;
  abstract create(source: Source): Promise<Source>;
  abstract createFileSource(source: FileSource): Promise<FileSource>;
  abstract createUrlSource(source: UrlSource): Promise<UrlSource>;
  abstract createSourceContentChunks(
    sourceContentChunks: SourceContentChunk[],
  ): Promise<SourceContentChunk[]>;
  abstract update(source: Source): Promise<Source>;
  abstract delete(id: UUID): Promise<void>;
  abstract matchSourceContentChunks(
    queryVector: number[],
    filter: {
      sourceId: UUID;
    },
    options?: {
      similarityThreshold?: number;
      limit?: number;
    },
  ): Promise<SourceContentChunk[]>;
}
