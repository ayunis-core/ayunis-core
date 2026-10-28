import { Injectable, Inject, Logger } from '@nestjs/common';
import { CreateSystemMessageCommand } from './create-system-message.command';
import { SystemMessage } from 'src/domain/messages/domain/messages/system-message.entity';
import {
  MESSAGES_REPOSITORY,
  MessagesRepository,
} from 'src/domain/messages/application/ports/messages.repository';
import { MessageRole } from 'src/domain/messages/domain/value-objects/message-role.object';
import { MessageCreationError } from 'src/domain/messages/application/messages.errors';

@Injectable()
export class CreateSystemMessageUseCase {
  private readonly logger = new Logger(CreateSystemMessageUseCase.name);

  constructor(
    @Inject(MESSAGES_REPOSITORY)
    private readonly messagesRepository: MessagesRepository,
  ) {}

  async execute(command: CreateSystemMessageCommand): Promise<SystemMessage> {
    this.logger.log({ threadId: command.threadId }, 'Creating system message');

    const systemMessage = new SystemMessage({
      threadId: command.threadId,
      content: command.content,
    });

    try {
      return (await this.messagesRepository.create(
        systemMessage,
      )) as SystemMessage;
    } catch (error) {
      this.logger.error(
        {
          threadId: command.threadId,
          err: error as Error,
        },
        'Failed to create system message',
      );
      throw error instanceof Error
        ? new MessageCreationError(MessageRole.SYSTEM.toLowerCase(), error)
        : new MessageCreationError(
            MessageRole.SYSTEM.toLowerCase(),
            new Error('Unknown error'),
          );
    }
  }
}
