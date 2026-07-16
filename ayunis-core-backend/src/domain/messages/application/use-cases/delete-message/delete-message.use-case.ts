import { Injectable, Logger, Inject } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { DeleteMessageCommand } from './delete-message.command';
import { UnexpectedMessageError } from '../../messages.errors';
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

  @HandleUnexpectedErrors(UnexpectedMessageError)
  async execute(command: DeleteMessageCommand): Promise<void> {
    this.logger.log('Deleting message', {
      messageId: command.messageId,
    });

    await this.messagesRepository.delete(command.messageId);
    this.logger.log('Message deleted successfully', {
      messageId: command.messageId,
    });
  }
}
