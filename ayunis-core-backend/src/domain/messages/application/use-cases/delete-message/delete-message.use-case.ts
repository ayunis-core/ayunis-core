import { Injectable, Logger, Inject } from '@nestjs/common';
import { DeleteMessageCommand } from './delete-message.command';
import {
  MESSAGES_REPOSITORY,
  MessagesRepository,
} from '../../ports/messages.repository';

@Injectable()
export class DeleteMessageUseCase {
  private readonly logger = new Logger(DeleteMessageUseCase.name);

  constructor(
    @Inject(MESSAGES_REPOSITORY)
    private readonly messagesRepository: MessagesRepository,
  ) {}

  async execute(command: DeleteMessageCommand): Promise<void> {
    this.logger.log('Deleting message', {
      messageId: command.messageId,
    });

    try {
      await this.messagesRepository.delete(command.messageId);
      this.logger.log('Message deleted successfully', {
        messageId: command.messageId,
      });
    } catch (error) {
      this.logger.error('Failed to delete message', {
        messageId: command.messageId,
        error: error as Error,
      });
      throw error;
    }
  }
}
