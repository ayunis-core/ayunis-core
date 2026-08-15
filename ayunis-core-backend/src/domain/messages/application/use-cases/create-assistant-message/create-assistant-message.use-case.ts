import { Injectable, Inject } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateAssistantMessageCommand } from './create-assistant-message.command';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import {
  MESSAGES_REPOSITORY,
  MessagesRepository,
} from '../../ports/messages.repository';
import { MessageRole } from 'src/domain/messages/domain/value-objects/message-role.object';
import { MessageCreationError } from '../../messages.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { AssistantMessageCreatedEvent } from '../../events/assistant-message-created.event';
import type { UUID } from 'crypto';

@Injectable()
export class CreateAssistantMessageUseCase {
  constructor(
    @Inject(MESSAGES_REPOSITORY)
    private readonly messagesRepository: MessagesRepository,
    private readonly contextService: ContextService,
    private readonly eventEmitter: EventEmitter2,
    @InjectPinoLogger(CreateAssistantMessageUseCase.name)
    private readonly logger: PinoLogger,
  ) {}

  async execute(
    command: CreateAssistantMessageCommand,
  ): Promise<AssistantMessage> {
    this.logger.info(
      { threadId: command.threadId },
      'Creating assistant message',
    );

    const assistantMessage = new AssistantMessage({
      threadId: command.threadId,
      content: command.content,
    });

    try {
      const saved = (await this.messagesRepository.create(
        assistantMessage,
      )) as AssistantMessage;

      this.emitMessageCreated(command.threadId, saved.id);
      return saved;
    } catch (error) {
      this.logger.error(
        {
          threadId: command.threadId,
          err: error as Error,
        },
        'Failed to create assistant message',
      );
      throw error instanceof Error
        ? new MessageCreationError(MessageRole.ASSISTANT.toLowerCase(), error)
        : new MessageCreationError(
            MessageRole.ASSISTANT.toLowerCase(),
            new Error('Unknown error'),
          );
    }
  }

  private emitMessageCreated(threadId: UUID, messageId: UUID): void {
    const userId = this.contextService.get('userId');
    const orgId = this.contextService.get('orgId');
    this.eventEmitter
      .emitAsync(
        AssistantMessageCreatedEvent.EVENT_NAME,
        new AssistantMessageCreatedEvent(
          userId ?? ('unknown' as UUID),
          orgId ?? ('unknown' as UUID),
          threadId,
          messageId,
        ),
      )
      .catch((err: unknown) => {
        this.logger.error(
          {
            error: err instanceof Error ? err.message : 'Unknown error',
            messageId,
          },
          'Failed to emit AssistantMessageCreatedEvent',
        );
      });
  }
}
