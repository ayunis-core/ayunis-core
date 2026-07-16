import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ThreadsRepository } from '../../ports/threads.repository';
import { RecordThreadActivityCommand } from './record-thread-activity.command';
import { UnexpectedThreadError } from '../../threads.errors';

/**
 * Bumps a thread's `lastActivityAt` to the time a message was added. Drives
 * inactivity-based data retention. Best-effort: failures are logged, not
 * thrown, because this runs off a fire-and-forget domain event and must never
 * break the message-add path. A missed bump is self-healing — the next message
 * advances the timestamp again, and retention windows are measured in months.
 */
@Injectable()
export class RecordThreadActivityUseCase {
  private readonly logger = new Logger(RecordThreadActivityUseCase.name);

  constructor(private readonly threadsRepository: ThreadsRepository) {}

  @HandleUnexpectedErrors(UnexpectedThreadError)
  async execute(command: RecordThreadActivityCommand): Promise<void> {
    try {
      await this.threadsRepository.updateLastActivityAt({
        threadId: command.threadId,
        lastActivityAt: command.occurredAt,
      });
    } catch (error) {
      this.logger.error('Failed to record thread activity', {
        threadId: command.threadId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
