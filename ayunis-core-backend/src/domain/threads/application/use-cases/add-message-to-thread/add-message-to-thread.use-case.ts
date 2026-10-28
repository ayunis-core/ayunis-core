import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { UUID } from 'crypto';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { AddMessageCommand } from './add-message.command';
import { MessageAdditionError } from 'src/domain/threads/application/threads.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { ThreadMessageAddedEvent } from 'src/domain/threads/application/events/thread-message-added.event';

@Injectable()
export class AddMessageToThreadUseCase {
  private readonly logger = new Logger(AddMessageToThreadUseCase.name);

  constructor(
    private readonly contextService: ContextService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  execute(command: AddMessageCommand): Thread {
    this.logger.log(
      {
        threadId: command.thread.id,
        messageRole: command.message.role,
      },
      'addMessage',
    );
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
          this.logger.error(
            {
              err: err as Error,
              threadId: command.thread.id,
            },
            'Failed to emit ThreadMessageAddedEvent',
          );
        });

      return command.thread;
    } catch (error) {
      this.logger.error(
        {
          threadId: command.thread.id,
          err: error as Error,
        },
        'Failed to add message to thread',
      );
      throw error instanceof Error
        ? new MessageAdditionError(command.thread.id, error)
        : new MessageAdditionError(
            command.thread.id,
            new Error('Unknown error'),
          );
    }
  }
}
