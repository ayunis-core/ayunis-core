import { Injectable, Inject, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { CreateToolResultMessageCommand } from './create-tool-result-message.command';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import {
  MESSAGES_REPOSITORY,
  MessagesRepository,
} from 'src/domain/messages/application/ports/messages.repository';
import {
  MessageThreadMissingError,
  UnexpectedToolResultMessageError,
} from 'src/domain/messages/application/messages.errors';

@Injectable()
export class CreateToolResultMessageUseCase {
  private readonly logger = new Logger(CreateToolResultMessageUseCase.name);

  constructor(
    @Inject(MESSAGES_REPOSITORY)
    private readonly messagesRepository: MessagesRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedToolResultMessageError)
  async execute(
    command: CreateToolResultMessageCommand,
  ): Promise<ToolResultMessage | null> {
    this.logger.log(
      {
        threadId: command.threadId,
      },
      'Creating tool result message',
    );

    const toolResultMessage = new ToolResultMessage({
      id: command.id,
      threadId: command.threadId,
      content: command.content,
    });

    try {
      return (await this.messagesRepository.create(
        toolResultMessage,
      )) as ToolResultMessage;
    } catch (error) {
      if (error instanceof MessageThreadMissingError) {
        this.logger.warn(
          { threadId: command.threadId },
          'Skipped saving tool result message because thread no longer exists',
        );
        return null;
      }
      throw error;
    }
  }
}
