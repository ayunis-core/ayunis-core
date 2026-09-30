import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { IndexRegistry } from 'src/domain/rag/indexers/application/indexer.registry';
import { UnexpectedIndexError } from 'src/domain/rag/indexers/application/indexer.errors';
import type { PreparedIndexContent } from 'src/domain/rag/indexers/domain/prepared-index-content.entity';
import { PrepareBulkContentCommand } from './prepare-bulk-content.command';

/**
 * Splits and embeds a document's content without writing anything, so the
 * provider calls never run inside a database transaction. Persist the result
 * with `ReplaceBulkContentUseCase`.
 */
@Injectable()
export class PrepareBulkContentUseCase {
  private readonly logger = new Logger(PrepareBulkContentUseCase.name);

  constructor(private readonly indexRegistry: IndexRegistry) {}

  @HandleUnexpectedErrors(UnexpectedIndexError)
  async execute(
    command: PrepareBulkContentCommand,
  ): Promise<PreparedIndexContent> {
    this.logger.log(
      { documentId: command.documentId, entryCount: command.entries.length },
      'Preparing index content',
    );
    return this.indexRegistry.get(command.type).prepareBulk({
      orgId: command.orgId,
      documentId: command.documentId,
      entries: command.entries,
    });
  }
}
