import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import type { ThreadPiiMask } from 'src/domain/thread-pii-masks/domain/thread-pii-mask.entity';
import { ThreadPiiMaskRepository } from 'src/domain/thread-pii-masks/application/ports/thread-pii-mask.repository';
import {
  ThreadPiiMaskNotFoundError,
  UnexpectedThreadPiiMasksError,
} from 'src/domain/thread-pii-masks/application/thread-pii-masks.errors';
import type { UnmaskThreadPiiMaskCommand } from './unmask-thread-pii-mask.command';

/**
 * Permanently unmasks one dictionary entry of a thread. The row is kept so
 * its token still resolves in stored messages and its index stays reserved,
 * but the value is exempt from future masking and revealed to the LLM.
 * Idempotent; returns the thread's full updated dictionary.
 */
@Injectable()
export class UnmaskThreadPiiMaskUseCase {
  private readonly logger = new Logger(UnmaskThreadPiiMaskUseCase.name);

  constructor(private readonly repository: ThreadPiiMaskRepository) {}

  async execute(command: UnmaskThreadPiiMaskCommand): Promise<ThreadPiiMask[]> {
    const logContext = { threadId: command.threadId, maskId: command.maskId };
    this.logger.log(logContext, 'Unmasking thread PII mask');

    try {
      const masks = await this.repository.findByThreadId(command.threadId);
      const mask = masks.find((entry) => entry.id === command.maskId);
      if (!mask) {
        throw new ThreadPiiMaskNotFoundError(command.threadId, command.maskId);
      }
      if (!mask.unmasked) {
        mask.unmasked = true;
        mask.updatedAt = new Date();
        await this.repository.saveMany([mask]);
      }
      return masks;
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        { err: error as Error, ...logContext },
        'Failed to unmask thread PII mask',
      );
      throw new UnexpectedThreadPiiMasksError('unmask', {
        ...logContext,
        ...(error instanceof Error && { originalError: error.message }),
      });
    }
  }
}
