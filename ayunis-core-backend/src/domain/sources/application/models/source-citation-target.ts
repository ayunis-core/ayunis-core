import type { UUID } from 'crypto';
import type { SourceCreator } from 'src/domain/sources/domain/source-creator.enum';
import type { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import type { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';

export interface SourceCitationTarget {
  chunk: TextSourceContentChunk;
  source: {
    id: UUID;
    name: string;
    createdBy: SourceCreator;
    status: SourceStatus;
    knowledgeBaseId: UUID | null;
    url: string | null;
  };
}
