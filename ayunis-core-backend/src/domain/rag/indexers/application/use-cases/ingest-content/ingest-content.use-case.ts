import { Injectable, Logger } from '@nestjs/common';
import { IndexRegistry } from '../../indexer.registry';
import { IngestContentCommand } from './ingest-content.command';
import { IndexEntry } from 'src/domain/rag/indexers/domain/index-entry.entity';
import { UnexpectedIndexError } from '../../indexer.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class IngestContentUseCase {
  private readonly logger = new Logger(IngestContentUseCase.name);
  constructor(private readonly indexRegistry: IndexRegistry) {}

  async execute(command: IngestContentCommand): Promise<void> {
    try {
      const index = this.indexRegistry.get(command.type);
      return index.ingest({
        orgId: command.orgId,
        indexEntry: new IndexEntry({
          relatedDocumentId: command.documentId,
          relatedChunkId: command.chunkId,
        }),
        content: command.content,
      });
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(error);
      throw new UnexpectedIndexError(error as Error);
    }
  }
}
