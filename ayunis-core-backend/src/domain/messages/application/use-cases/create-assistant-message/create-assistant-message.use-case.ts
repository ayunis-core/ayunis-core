import { Injectable, Logger, Inject } from '@nestjs/common';
import { CreateAssistantMessageCommand } from './create-assistant-message.command';
import { AssistantMessage } from '../../../domain/messages/assistant-message.entity';
import {
  MESSAGES_REPOSITORY,
  MessagesRepository,
} from '../../ports/messages.repository';
import { MessageRole } from '../../../domain/value-objects/message-role.object';
import { MessageCreationError } from '../../messages.errors';

@Injectable()
export class CreateAssistantMessageUseCase {
  private readonly logger = new Logger(CreateAssistantMessageUseCase.name);

  constructor(
    @Inject(MESSAGES_REPOSITORY)
    private readonly messagesRepository: MessagesRepository,
  ) {}

  async execute(
    command: CreateAssistantMessageCommand,
  ): Promise<AssistantMessage> {
    this.logger.log('Creating assistant message', {
      threadId: command.threadId,
    });

    const assistantMessage = new AssistantMessage({
      threadId: command.threadId,
      content: command.content,
    });

    try {
      return (await this.messagesRepository.create(
        assistantMessage,
      )) as AssistantMessage;
    } catch (error) {
      this.logger.error('Failed to create assistant message', {
        threadId: command.threadId,
        error,
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
