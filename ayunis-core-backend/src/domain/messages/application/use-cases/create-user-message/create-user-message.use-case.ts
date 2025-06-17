import { Injectable, Logger, Inject } from '@nestjs/common';
import { CreateUserMessageCommand } from './create-user-message.command';
import { UserMessage } from '../../../domain/messages/user-message.entity';
import {
  MESSAGES_REPOSITORY,
  MessagesRepository,
} from '../../ports/messages.repository';
import { MessageRole } from '../../../domain/value-objects/message-role.object';
import { MessageCreationError } from '../../messages.errors';

@Injectable()
export class CreateUserMessageUseCase {
  private readonly logger = new Logger(CreateUserMessageUseCase.name);

  constructor(
    @Inject(MESSAGES_REPOSITORY)
    private readonly messagesRepository: MessagesRepository,
  ) {}

  async execute(command: CreateUserMessageCommand): Promise<UserMessage> {
    this.logger.log('Creating user message', { threadId: command.threadId });

    const userMessage = new UserMessage({
      threadId: command.threadId,
      content: command.content,
    });

    try {
      return (await this.messagesRepository.create(userMessage)) as UserMessage;
    } catch (error) {
      this.logger.error('Failed to create user message', {
        threadId: command.threadId,
        error,
      });
      throw error instanceof Error
        ? new MessageCreationError(MessageRole.USER.toLowerCase(), error)
        : new MessageCreationError(
            MessageRole.USER.toLowerCase(),
            new Error('Unknown error'),
          );
    }
  }
}
