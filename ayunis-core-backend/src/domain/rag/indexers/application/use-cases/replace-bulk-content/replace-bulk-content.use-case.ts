import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { IndexRegistry } from 'src/domain/rag/indexers/application/indexer.registry';
import { UnexpectedIndexError } from 'src/domain/rag/indexers/application/indexer.errors';
import { ReplaceBulkContentCommand } from './replace-bulk-content.command';

/**
 * Replaces all stored index entries of the prepared document in one
 * transaction, joining the caller's transaction when one is active.
 */
@Injectable()
export class ReplaceBulkContentUseCase {
  private readonly logger = new Logger(ReplaceBulkContentUseCase.name);

  constructor(private readonly indexRegistry: IndexRegistry) {}

  @HandleUnexpectedErrors(UnexpectedIndexError)
  async execute(command: ReplaceBulkContentCommand): Promise<void> {
    const { prepared } = command;
    this.logger.log(
      { documentId: prepared.documentId, type: prepared.type },
      'Replacing index content',
    );
    await this.indexRegistry.get(prepared.type).replace(prepared);
  }
}
