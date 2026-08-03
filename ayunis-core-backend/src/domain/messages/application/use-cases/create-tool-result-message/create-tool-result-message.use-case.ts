import { Injectable, Logger, Inject } from '@nestjs/common';
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
  private readonly logger = new Logger(CreateToolResultMessageUseCase.name);

  constructor(
    @Inject(MESSAGES_REPOSITORY)
    private readonly messagesRepository: MessagesRepository,
  ) {}

  async execute(
    command: CreateToolResultMessageCommand,
  ): Promise<ToolResultMessage> {
    this.logger.log('Creating tool result message', {
      threadId: command.threadId,
    });

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
      this.logger.error('Failed to create tool result message', {
        threadId: command.threadId,
        error: error as Error,
      });
      throw error instanceof Error
        ? new MessageCreationError(MessageRole.TOOL.toLowerCase(), error)
        : new MessageCreationError(
            MessageRole.TOOL.toLowerCase(),
            new Error('Unknown error'),
          );
    }
  }
}
