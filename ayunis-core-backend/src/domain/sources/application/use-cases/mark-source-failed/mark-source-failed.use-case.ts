import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { SourceRepository } from '../../ports/source.repository';
import {
  SourceNotFoundError,
  UnexpectedSourceError,
} from '../../sources.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { MarkSourceFailedCommand } from './mark-source-failed.command';

@Injectable()
export class MarkSourceFailedUseCase {
  constructor(
    @InjectPinoLogger(MarkSourceFailedUseCase.name)
    private readonly logger: PinoLogger,
    private readonly sourceRepository: SourceRepository,
  ) {}

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
