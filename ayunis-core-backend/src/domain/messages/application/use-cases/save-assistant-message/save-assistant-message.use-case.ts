import { Injectable, Logger, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SaveAssistantMessageCommand } from './save-assistant-message.command';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import {
  MESSAGES_REPOSITORY,
  MessagesRepository,
} from '../../ports/messages.repository';
import { MessageRole } from 'src/domain/messages/domain/value-objects/message-role.object';
import {
  MessageCreationError,
  MessageThreadMissingError,
} from '../../messages.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { AssistantMessageCreatedEvent } from '../../events/assistant-message-created.event';
import type { UUID } from 'crypto';

@Injectable()
export class SaveAssistantMessageUseCase {
  private readonly logger = new Logger(SaveAssistantMessageUseCase.name);

  constructor(
    @Inject(MESSAGES_REPOSITORY)
    private readonly messagesRepository: MessagesRepository,
    private readonly contextService: ContextService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    command: SaveAssistantMessageCommand,
  ): Promise<AssistantMessage | null> {
    this.logger.log('Saving assistant message', {
      messageId: command.message.id,
      threadId: command.message.threadId,
    });

    try {
      const saved = (await this.messagesRepository.create(
        command.message,
      )) as AssistantMessage;

      this.emitCreatedEvent(command, saved);
      return saved;
    } catch (error) {
      if (error instanceof MessageThreadMissingError) {
        this.logger.warn(
          'Skipped saving assistant message because thread no longer exists',
          {
            messageId: command.message.id,
            threadId: command.message.threadId,
          },
        );
        return null;
      }
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

  private emitCreatedEvent(
    command: SaveAssistantMessageCommand,
    saved: AssistantMessage,
  ): void {
    const userId = this.contextService.get('userId');
    const orgId = this.contextService.get('orgId');
    this.eventEmitter
      .emitAsync(
        AssistantMessageCreatedEvent.EVENT_NAME,
        new AssistantMessageCreatedEvent(
          userId ?? ('unknown' as UUID),
          orgId ?? ('unknown' as UUID),
          command.message.threadId,
          saved.id,
        ),
      )
      .catch((err: unknown) => {
        this.logger.error('Failed to emit AssistantMessageCreatedEvent', {
          error: err instanceof Error ? err.message : 'Unknown error',
          messageId: saved.id,
        });
      });
  }
}
