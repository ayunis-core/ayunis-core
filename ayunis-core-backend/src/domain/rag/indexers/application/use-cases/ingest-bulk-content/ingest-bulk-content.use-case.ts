import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { IndexRegistry } from '../../indexer.registry';
import { IngestBulkContentCommand } from './ingest-bulk-content.command';
import { IndexEntry } from 'src/domain/rag/indexers/domain/index-entry.entity';
import { UnexpectedIndexError } from '../../indexer.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class IngestBulkContentUseCase {
  constructor(
    @InjectPinoLogger(IngestBulkContentUseCase.name)
    private readonly logger: PinoLogger,
    private readonly indexRegistry: IndexRegistry,
  ) {}

  async execute(command: IngestBulkContentCommand): Promise<void> {
    try {
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
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error({ err: error as Error }, 'Failed to ingest content');
      throw new UnexpectedIndexError(error as Error);
    }
  }
}
