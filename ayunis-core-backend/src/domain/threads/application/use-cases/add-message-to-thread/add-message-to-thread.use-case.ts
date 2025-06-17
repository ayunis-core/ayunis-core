import { Injectable, Logger } from '@nestjs/common';
import { Thread } from '../../../domain/thread.entity';
import { AddMessageCommand } from './add-message.command';
import { MessageAdditionError } from '../../threads.errors';

@Injectable()
export class AddMessageToThreadUseCase {
  private readonly logger = new Logger(AddMessageToThreadUseCase.name);

  async execute(command: AddMessageCommand): Promise<Thread> {
    this.logger.log('addMessage', {
      threadId: command.thread.id,
      messageRole: command.message.role,
    });
    try {
      command.thread.messages.push(command.message);
      return command.thread;
    } catch (error) {
      this.logger.error('Failed to add message to thread', {
        threadId: command.thread.id,
        error,
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
