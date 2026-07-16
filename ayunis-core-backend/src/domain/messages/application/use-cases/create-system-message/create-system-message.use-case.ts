import { Injectable, Logger, Inject } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { CreateSystemMessageCommand } from './create-system-message.command';
import { SystemMessage } from '../../../domain/messages/system-message.entity';
import {
  MESSAGES_REPOSITORY,
  MessagesRepository,
} from '../../ports/messages.repository';
import { MessageRole } from '../../../domain/value-objects/message-role.object';
import {
  MessageCreationError,
  UnexpectedMessageError,
} from '../../messages.errors';

@Injectable()
export class CreateSystemMessageUseCase {
  private readonly logger = new Logger(CreateSystemMessageUseCase.name);

  constructor(
    @Inject(MESSAGES_REPOSITORY)
    private readonly messagesRepository: MessagesRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedMessageError)
  async execute(command: CreateSystemMessageCommand): Promise<SystemMessage> {
    this.logger.log('Creating system message', { threadId: command.threadId });

    const systemMessage = new SystemMessage({
      threadId: command.threadId,
      content: command.content,
    });

    try {
      return (await this.messagesRepository.create(
        systemMessage,
      )) as SystemMessage;
    } catch (error) {
      this.logger.error('Failed to create system message', {
        threadId: command.threadId,
        error: error as Error,
      });
      throw error instanceof Error
        ? new MessageCreationError(MessageRole.SYSTEM.toLowerCase(), error)
        : new MessageCreationError(
            MessageRole.SYSTEM.toLowerCase(),
            new Error('Unknown error'),
          );
    }
  }
}
