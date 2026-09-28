import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import {
  SourceNotFoundError,
  UnexpectedSourceError,
} from 'src/domain/sources/application/sources.errors';
import { MarkSourceFailedCommand } from './mark-source-failed.command';

@Injectable()
export class MarkSourceFailedUseCase {
  private readonly logger = new Logger(MarkSourceFailedUseCase.name);

  constructor(private readonly sourceRepository: SourceRepository) {}

  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(command: MarkSourceFailedCommand): Promise<void> {
    const source = await this.sourceRepository.findById(command.sourceId);
    if (!source) throw new SourceNotFoundError(command.sourceId);

    source.status = SourceStatus.FAILED;
    source.processingError = command.errorMessage;
    source.processingErrorCode = command.errorCode;
    await this.sourceRepository.save(source);

    this.logger.warn(
      { sourceId: command.sourceId, err: new Error(command.errorMessage) },
      'Source marked as failed',
    );
  }
}
