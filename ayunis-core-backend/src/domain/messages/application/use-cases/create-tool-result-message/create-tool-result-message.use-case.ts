import { Injectable, Inject } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
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
  constructor(
    @Inject(MESSAGES_REPOSITORY)
    private readonly messagesRepository: MessagesRepository,
    @InjectPinoLogger(CreateToolResultMessageUseCase.name)
    private readonly logger: PinoLogger,
  ) {}

  @HandleUnexpectedErrors(UnexpectedToolResultMessageError)
  async execute(
    command: CreateToolResultMessageCommand,
  ): Promise<ToolResultMessage | null> {
    this.logger.info(
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
