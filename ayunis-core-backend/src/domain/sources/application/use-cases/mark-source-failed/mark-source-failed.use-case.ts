import { Injectable, Logger } from '@nestjs/common';
import { SourceStatus } from '../../../domain/source-status.enum';
import { SourceRepository } from '../../ports/source.repository';
import {
  SourceNotFoundError,
  UnexpectedSourceError,
} from '../../sources.errors';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { MarkSourceFailedCommand } from './mark-source-failed.command';

@Injectable()
export class MarkSourceFailedUseCase {
  private readonly logger = new Logger(MarkSourceFailedUseCase.name);

  constructor(private readonly sourceRepository: SourceRepository) {}

  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(command: MarkSourceFailedCommand): Promise<void> {
    const source = await this.sourceRepository.findById(command.sourceId);
    if (!source) {
      throw new SourceNotFoundError(command.sourceId);
    }

    source.status = SourceStatus.FAILED;
    source.processingError = command.errorMessage;
    await this.sourceRepository.save(source);

    this.logger.warn('Source marked as failed', {
      sourceId: command.sourceId,
      errorMessage: command.errorMessage,
    });
  }
}
