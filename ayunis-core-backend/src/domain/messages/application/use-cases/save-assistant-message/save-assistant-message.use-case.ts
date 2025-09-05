import { Injectable, Logger, Inject } from '@nestjs/common';
import { SaveAssistantMessageCommand } from './save-assistant-message.command';
import { AssistantMessage } from '../../../domain/messages/assistant-message.entity';
import {
  MESSAGES_REPOSITORY,
  MessagesRepository,
} from '../../ports/messages.repository';
import { MessageRole } from '../../../domain/value-objects/message-role.object';
import { MessageCreationError } from '../../messages.errors';

@Injectable()
export class SaveAssistantMessageUseCase {
  private readonly logger = new Logger(SaveAssistantMessageUseCase.name);

  constructor(
    @Inject(MESSAGES_REPOSITORY)
    private readonly messagesRepository: MessagesRepository,
  ) {}

  async execute(
    command: SaveAssistantMessageCommand,
  ): Promise<AssistantMessage> {
    this.logger.log('Saving assistant message', {
      messageId: command.message.id,
      threadId: command.message.threadId,
    });

    try {
      return (await this.messagesRepository.create(
        command.message,
      )) as AssistantMessage;
    } catch (error) {
      this.logger.error('Failed to save assistant message', {
        messageId: command.message.id,
        threadId: command.message.threadId,
        error: error as Error,
      });
      throw error instanceof Error
        ? new MessageCreationError(MessageRole.ASSISTANT.toLowerCase(), error)
        : new MessageCreationError(
            MessageRole.ASSISTANT.toLowerCase(),
            new Error('Unknown error'),
          );
    }
  }
}
