import { Injectable, Inject, Logger } from '@nestjs/common';
import { DeleteMessageCommand } from './delete-message.command';
import {
  MESSAGES_REPOSITORY,
  MessagesRepository,
} from 'src/domain/messages/application/ports/messages.repository';

@Injectable()
export class DeleteMessageUseCase {
  private readonly logger = new Logger(DeleteMessageUseCase.name);

  constructor(
    @Inject(MESSAGES_REPOSITORY)
    private readonly messagesRepository: MessagesRepository,
  ) {}

  async execute(command: DeleteMessageCommand): Promise<void> {
    this.logger.log(
      {
        messageId: command.messageId,
      },
      'Deleting message',
    );

    try {
      await this.messagesRepository.delete(command.messageId);
      this.logger.log(
        {
          messageId: command.messageId,
        },
        'Message deleted successfully',
      );
    } catch (error) {
      this.logger.error(
        {
          messageId: command.messageId,
          err: error as Error,
        },
        'Failed to delete message',
      );
      throw error;
    }
  }
}
