import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { UUID } from 'crypto';
import { Thread } from '../../../domain/thread.entity';
import { AddMessageCommand } from './add-message.command';
import { MessageAdditionError } from '../../threads.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { ThreadMessageAddedEvent } from '../../events/thread-message-added.event';

@Injectable()
export class AddMessageToThreadUseCase {
  private readonly logger = new Logger(AddMessageToThreadUseCase.name);

  constructor(
    private readonly contextService: ContextService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  execute(command: AddMessageCommand): Thread {
    this.logger.log('addMessage', {
      threadId: command.thread.id,
      messageRole: command.message.role,
    });
    try {
      command.thread.messages.push(command.message);

      // Emitting on every message addition is intentional: it gives the
      // distribution of thread sizes at write time. The _sum/_count ratio
      // yields average thread length across all writes.
      const userId = this.contextService.get('userId');
      const orgId = this.contextService.get('orgId');
      this.eventEmitter
        .emitAsync(
          ThreadMessageAddedEvent.EVENT_NAME,
          new ThreadMessageAddedEvent(
            userId ?? ('unknown' as UUID),
            orgId ?? ('unknown' as UUID),
            command.thread.id,
            command.thread.messages.length,
          ),
        )
        .catch((err: unknown) => {
          this.logger.error('Failed to emit ThreadMessageAddedEvent', {
            error: err instanceof Error ? err.message : 'Unknown error',
            threadId: command.thread.id,
          });
        });

      return command.thread;
    } catch (error) {
      this.logger.error('Failed to add message to thread', {
        threadId: command.thread.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error instanceof Error
        ? new MessageAdditionError(command.thread.id, error)
        : new MessageAdditionError(
            command.thread.id,
            new Error('Unknown error'),
          );
    }
  }
}
