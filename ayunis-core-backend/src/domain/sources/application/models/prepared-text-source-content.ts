import type { PreparedIndexContent } from 'src/domain/rag/indexers/domain/prepared-index-content.entity';
import type { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';

export interface PreparedTextSourceContent {
  text: string;
  chunks: TextSourceContentChunk[];
  index: PreparedIndexContent;
}
