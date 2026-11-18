import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SourceBatchWriteRepository } from 'src/domain/sources/application/ports/source-batch-write.repository';
import { UnexpectedSourceError } from 'src/domain/sources/application/sources.errors';
import { LockSourcesCommand } from './lock-sources.command';

/**
 * Locks sources until the caller's transaction ends. Deleting a source locks
 * it before the rows that refer to it, so a caller that also locks such rows
 * takes this lock first to keep the same order. For trusted callers (the sync
 * engine).
 */
@Injectable()
export class LockSourcesUseCase {
  private readonly logger = new Logger(LockSourcesUseCase.name);

  constructor(private readonly repository: SourceBatchWriteRepository) {}

  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(command: LockSourcesCommand): Promise<void> {
    this.logger.debug({ count: command.sourceIds.length }, 'Locking sources');
    await this.repository.lock(command.sourceIds);
  }
}
