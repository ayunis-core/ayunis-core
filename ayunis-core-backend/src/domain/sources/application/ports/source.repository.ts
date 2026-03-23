import type { UUID } from 'crypto';
import type { TextSource } from '../../domain/sources/text-source.entity';
import type { DataSource } from '../../domain/sources/data-source.entity';
import type { Source } from '../../domain/source.entity';
import type { TextSourceContentChunk } from '../../domain/source-content-chunk.entity';

export abstract class SourceRepository {
  abstract findById(id: UUID): Promise<TextSource | DataSource | null>;
  abstract findByIds(ids: UUID[]): Promise<Source[]>;
  abstract findByKnowledgeBaseId(knowledgeBaseId: UUID): Promise<Source[]>;
  abstract saveTextSource(
    source: TextSource,
    content: { text: string; chunks: TextSourceContentChunk[] },
  ): Promise<TextSource>;
  abstract save(source: Source): Promise<Source>;
  abstract extractTextLines(
    sourceId: UUID,
    startLine: number,
    endLine: number,
  ): Promise<{ totalLines: number; text: string } | null>;
  abstract findContentChunksByIds(
    chunkIds: UUID[],
  ): Promise<
    { chunk: TextSourceContentChunk; sourceId: UUID; sourceName: string }[]
  >;
  abstract delete(sourceId: UUID): Promise<void>;
  abstract deleteMany(sourceIds: UUID[]): Promise<void>;
}
