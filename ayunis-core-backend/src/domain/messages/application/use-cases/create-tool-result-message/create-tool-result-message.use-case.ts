import { Injectable, Inject } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CreateToolResultMessageCommand } from './create-tool-result-message.command';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import {
  MESSAGES_REPOSITORY,
  MessagesRepository,
} from '../../ports/messages.repository';
import { MessageRole } from 'src/domain/messages/domain/value-objects/message-role.object';
import { MessageCreationError } from '../../messages.errors';

@Injectable()
export class CreateToolResultMessageUseCase {
  constructor(
    @Inject(MESSAGES_REPOSITORY)
    private readonly messagesRepository: MessagesRepository,
    @InjectPinoLogger(CreateToolResultMessageUseCase.name)
    private readonly logger: PinoLogger,
  ) {}

  async execute(
    command: CreateToolResultMessageCommand,
  ): Promise<ToolResultMessage> {
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
      this.logger.error(
        {
          threadId: command.threadId,
          err: error as Error,
        },
        'Failed to create tool result message',
      );
      throw error instanceof Error
        ? new MessageCreationError(MessageRole.TOOL.toLowerCase(), error)
        : new MessageCreationError(
            MessageRole.TOOL.toLowerCase(),
            new Error('Unknown error'),
          );
    }
  }
}
