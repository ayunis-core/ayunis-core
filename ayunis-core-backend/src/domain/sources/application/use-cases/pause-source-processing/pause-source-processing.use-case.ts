import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SourceBatchWriteRepository } from 'src/domain/sources/application/ports/source-batch-write.repository';
import { UnexpectedSourceError } from 'src/domain/sources/application/sources.errors';
import { PauseSourceProcessingCommand } from './pause-source-processing.command';

/**
 * Keeps a PROCESSING source whose processing waits for a provider outage to
 * end from being failed as stuck: the stale-processing cleanup counts from
 * the next time the document pipeline picks it up. For trusted callers (the
 * sync engine's back-off).
 */
@Injectable()
export class PauseSourceProcessingUseCase {
  private readonly logger = new Logger(PauseSourceProcessingUseCase.name);

  constructor(private readonly repository: SourceBatchWriteRepository) {}

  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(command: PauseSourceProcessingCommand): Promise<void> {
    this.logger.log({ sourceId: command.sourceId }, 'Pausing processing');
    await this.repository.pauseProcessing(command.sourceId);
  }
}
