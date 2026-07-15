import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { IndexRegistry } from '../../indexer.registry';
import { IngestBulkContentCommand } from './ingest-bulk-content.command';
import { IndexEntry } from 'src/domain/rag/indexers/domain/index-entry.entity';
import { UnexpectedIndexError } from '../../indexer.errors';

@Injectable()
export class IngestBulkContentUseCase {
  private readonly logger = new Logger(IngestBulkContentUseCase.name);
  constructor(private readonly indexRegistry: IndexRegistry) {}

  @HandleUnexpectedErrors(UnexpectedIndexError)
  async execute(command: IngestBulkContentCommand): Promise<void> {
    const index = this.indexRegistry.get(command.type);
    return await index.ingestBulk({
      orgId: command.orgId,
      entries: command.entries.map((entry) => ({
        indexEntry: new IndexEntry({
          relatedDocumentId: entry.documentId,
          relatedChunkId: entry.chunkId,
        }),
        content: entry.content,
      })),
    });
  }
}
