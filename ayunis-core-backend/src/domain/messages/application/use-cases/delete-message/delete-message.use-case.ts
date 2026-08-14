import { Injectable, Inject } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { DeleteMessageCommand } from './delete-message.command';
import {
  MESSAGES_REPOSITORY,
  MessagesRepository,
} from '../../ports/messages.repository';

@Injectable()
export class DeleteMessageUseCase {
  constructor(
    @Inject(MESSAGES_REPOSITORY)
    private readonly messagesRepository: MessagesRepository,
    @InjectPinoLogger(DeleteMessageUseCase.name)
    private readonly logger: PinoLogger,
  ) {}

  async execute(command: DeleteMessageCommand): Promise<void> {
    this.logger.info(
      {
        messageId: command.messageId,
      },
      'Deleting message',
    );

    try {
      await this.messagesRepository.delete(command.messageId);
      this.logger.info(
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
