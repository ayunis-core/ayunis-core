import { Injectable, Logger } from '@nestjs/common';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import {
  SourceNotFoundError,
  UnexpectedSourceError,
} from 'src/domain/sources/application/sources.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { MarkSourceFailedCommand } from './mark-source-failed.command';

@Injectable()
export class MarkSourceFailedUseCase {
  private readonly logger = new Logger(MarkSourceFailedUseCase.name);

  constructor(private readonly sourceRepository: SourceRepository) {}

  async execute(command: MarkSourceFailedCommand): Promise<void> {
    try {
      const source = await this.sourceRepository.findById(command.sourceId);
      if (!source) {
        throw new SourceNotFoundError(command.sourceId);
      }

      source.status = SourceStatus.FAILED;
      source.processingError = command.errorMessage;
      await this.sourceRepository.save(source);

      this.logger.warn(
        {
          sourceId: command.sourceId,
          err: new Error(command.errorMessage),
        },
        'Source marked as failed',
      );
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          err: error as Error,
        },
        'Error marking source as failed',
      );
      throw new UnexpectedSourceError('Error marking source as failed', {
        error: error as Error,
      });
    }
  }
}
