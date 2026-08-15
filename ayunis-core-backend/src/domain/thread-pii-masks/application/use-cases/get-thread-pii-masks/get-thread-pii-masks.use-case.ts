import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ApplicationError } from 'src/common/errors/base.error';
import { ThreadPiiMaskRepository } from '../../ports/thread-pii-mask.repository';
import { UnexpectedThreadPiiMasksError } from '../../thread-pii-masks.errors';
import type { ThreadPiiMask } from 'src/domain/thread-pii-masks/domain/thread-pii-mask.entity';
import type { GetThreadPiiMasksQuery } from './get-thread-pii-masks.query';

@Injectable()
export class GetThreadPiiMasksUseCase {
  constructor(
    @InjectPinoLogger(GetThreadPiiMasksUseCase.name)
    private readonly logger: PinoLogger,
    private readonly repository: ThreadPiiMaskRepository,
  ) {}

  async execute(query: GetThreadPiiMasksQuery): Promise<ThreadPiiMask[]> {
    this.logger.debug(
      {
        threadId: query.threadId,
      },
      'Getting thread PII masks',
    );

    try {
      return await this.repository.findByThreadId(query.threadId);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;

      this.logger.error(
        {
          err: error as Error,
          threadId: query.threadId,
        },
        'Failed to get thread PII masks',
      );

      throw new UnexpectedThreadPiiMasksError('get', {
        threadId: query.threadId,
        ...(error instanceof Error && { originalError: error.message }),
      });
    }
  }
}
