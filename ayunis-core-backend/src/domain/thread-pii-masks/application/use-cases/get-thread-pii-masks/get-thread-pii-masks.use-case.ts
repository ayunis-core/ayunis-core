import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { ThreadPiiMaskRepository } from '../../ports/thread-pii-mask.repository';
import { UnexpectedThreadPiiMasksError } from '../../thread-pii-masks.errors';
import type { ThreadPiiMask } from '../../../domain/thread-pii-mask.entity';
import type { GetThreadPiiMasksQuery } from './get-thread-pii-masks.query';

@Injectable()
export class GetThreadPiiMasksUseCase {
  private readonly logger = new Logger(GetThreadPiiMasksUseCase.name);

  constructor(private readonly repository: ThreadPiiMaskRepository) {}

  async execute(query: GetThreadPiiMasksQuery): Promise<ThreadPiiMask[]> {
    this.logger.debug('Getting thread PII masks', {
      threadId: query.threadId,
    });

    try {
      return await this.repository.findByThreadId(query.threadId);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;

      this.logger.error('Failed to get thread PII masks', {
        error: error instanceof Error ? error.message : 'Unknown error',
        threadId: query.threadId,
      });

      throw new UnexpectedThreadPiiMasksError('get', {
        threadId: query.threadId,
        ...(error instanceof Error && { originalError: error.message }),
      });
    }
  }
}
