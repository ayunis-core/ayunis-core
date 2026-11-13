import type { PreparedContentEmbeddings } from 'src/domain/rag/indexers/application/models/prepared-content-embeddings';
import type { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';

export interface ExtractedContent {
  text: string;
  chunks: TextSourceContentChunk[];
  precomputedEmbeddings: PreparedContentEmbeddings | undefined;
}
