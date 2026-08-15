import { Injectable, Inject } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CreateSystemMessageCommand } from './create-system-message.command';
import { SystemMessage } from 'src/domain/messages/domain/messages/system-message.entity';
import {
  MESSAGES_REPOSITORY,
  MessagesRepository,
} from '../../ports/messages.repository';
import { MessageRole } from 'src/domain/messages/domain/value-objects/message-role.object';
import { MessageCreationError } from '../../messages.errors';

@Injectable()
export class CreateSystemMessageUseCase {
  constructor(
    @Inject(MESSAGES_REPOSITORY)
    private readonly messagesRepository: MessagesRepository,
    @InjectPinoLogger(CreateSystemMessageUseCase.name)
    private readonly logger: PinoLogger,
  ) {}

  async execute(command: CreateSystemMessageCommand): Promise<SystemMessage> {
    this.logger.info({ threadId: command.threadId }, 'Creating system message');

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
