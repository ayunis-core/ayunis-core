import { Injectable, Logger } from '@nestjs/common';
import { UUID } from 'crypto';
import { Message } from 'src/domain/messages/domain/message.entity';
import { MessageRole } from 'src/domain/messages/domain/value-objects/message-role.object';
import { DeleteMessageUseCase } from 'src/domain/messages/application/use-cases/delete-message/delete-message.use-case';
import { DeleteMessageCommand } from 'src/domain/messages/application/use-cases/delete-message/delete-message.command';
import { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import { FindThreadQuery } from 'src/domain/threads/application/use-cases/find-thread/find-thread.query';

/**
 * Ensures threads end with an assistant message after a run completes or is interrupted.
 * Deletes trailing non-assistant messages (e.g., tool results) that would leave the
 * conversation in an inconsistent state.
 */
@Injectable()
export class MessageCleanupService {
  private readonly logger = new Logger(MessageCleanupService.name);

  constructor(
    private readonly findThreadUseCase: FindThreadUseCase,
    private readonly deleteMessageUseCase: DeleteMessageUseCase,
  ) {}

  /**
   * Ensures the thread ends with an assistant message by deleting any trailing messages
   * that come after the specified saved assistant message. This is critical when the stream
   * is interrupted - we need to delete any trailing non-assistant messages (like tool results)
   * to maintain conversation integrity.
   */
  async cleanupTrailingNonAssistantMessages(
    threadId: UUID,
    savedMessageId: UUID | null,
  ): Promise<void> {
    try {
      const { thread: updatedThread } = await this.findThreadUseCase.execute(
        new FindThreadQuery(threadId),
      );

      const threadMessages = updatedThread.messages;
      if (threadMessages.length === 0) {
        this.logger.warn('Thread has no messages after save', { threadId });
        return;
      }

      if (savedMessageId) {
        await this.cleanupAfterSavedMessage(
          threadId,
          threadMessages,
          savedMessageId,
        );
      } else {
        await this.deleteMessagesUntilAssistant(threadId, threadMessages);
      }
    } catch (error) {
      this.logger.error('Error during message cleanup', {
        threadId,
        error: error as Error,
      });
      // Don't throw - we want to gracefully handle cleanup failures
    }
  }

  private async cleanupAfterSavedMessage(
    threadId: UUID,
    threadMessages: Message[],
    savedMessageId: UUID,
  ): Promise<void> {
    const savedMessageIndex = threadMessages.findIndex(
      (m) => m.id === savedMessageId,
    );

    if (savedMessageIndex === -1) {
      this.logger.warn('Saved assistant message not found in thread', {
        threadId,
        assistantMessageId: savedMessageId,
      });
      await this.deleteMessagesUntilAssistant(threadId, threadMessages);
      return;
    }

    const messagesAfterAssistant = threadMessages.slice(savedMessageIndex + 1);

    if (messagesAfterAssistant.length === 0) {
      this.logger.debug('Thread correctly ends with assistant message', {
        threadId,
        lastMessageId: savedMessageId,
      });
    } else {
      this.logger.log(
        'Found messages after saved assistant message, cleaning up',
        {
          threadId,
          assistantMessageId: savedMessageId,
          messagesAfterCount: messagesAfterAssistant.length,
        },
      );
      await this.deleteTrailingMessages(threadId, messagesAfterAssistant);
    }
  }

  /**
   * Deletes messages from the end of the thread until an assistant message is found.
   */
  async deleteMessagesUntilAssistant(
    threadId: UUID,
    threadMessages: Message[],
  ): Promise<void> {
    const lastMessage = threadMessages[threadMessages.length - 1];
    if (lastMessage.role !== MessageRole.ASSISTANT) {
      const messagesToDelete: Message[] = [];
      for (let i = threadMessages.length - 1; i >= 0; i--) {
        const message = threadMessages[i];
        if (message.role === MessageRole.ASSISTANT) {
          break;
        }
        messagesToDelete.push(message);
      }
      await this.deleteTrailingMessages(threadId, messagesToDelete);
    }
  }

  async deleteTrailingMessages(
    threadId: UUID,
    messages: Message[],
  ): Promise<void> {
    if (messages.length === 0) return;

    this.logger.log('Deleting trailing messages', {
      threadId,
      count: messages.length,
      messageIds: messages.map((m) => m.id),
    });

    for (const message of messages) {
      try {
        await this.deleteMessageUseCase.execute(
          new DeleteMessageCommand(message.id),
        );
        this.logger.debug('Deleted trailing message', {
          messageId: message.id,
          role: message.role,
        });
      } catch (error) {
        this.logger.error('Failed to delete trailing message', {
          messageId: message.id,
          role: message.role,
          error: error as Error,
        });
        // Continue with cleanup even if one deletion fails
      }
    }

    this.logger.log('Successfully cleaned up trailing messages', {
      threadId,
      deletedCount: messages.length,
    });
  }
}
