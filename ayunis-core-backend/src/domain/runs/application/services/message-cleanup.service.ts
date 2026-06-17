import { Injectable, Logger } from '@nestjs/common';
import { UUID } from 'crypto';
import { Message } from 'src/domain/messages/domain/message.entity';
import { MessageRole } from 'src/domain/messages/domain/value-objects/message-role.object';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { DeleteMessageUseCase } from 'src/domain/messages/application/use-cases/delete-message/delete-message.use-case';
import { DeleteMessageCommand } from 'src/domain/messages/application/use-cases/delete-message/delete-message.command';
import { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import { FindThreadQuery } from 'src/domain/threads/application/use-cases/find-thread/find-thread.query';

/**
 * Cleans up threads after a failed or interrupted run.
 * Deletes trailing non-assistant messages (e.g., tool results) and orphaned
 * tool_use assistant messages that would leave the conversation in an
 * inconsistent state for providers requiring tool_use → tool_result pairing.
 *
 * Only called on the error path — successful runs leave the thread in a
 * valid state by design.
 */
@Injectable()
export class MessageCleanupService {
  private readonly logger = new Logger(MessageCleanupService.name);

  constructor(
    private readonly findThreadUseCase: FindThreadUseCase,
    private readonly deleteMessageUseCase: DeleteMessageUseCase,
  ) {}

  /**
   * Ensures the thread ends with a clean assistant message (no tool_use)
   * by deleting trailing non-assistant messages and orphaned tool_use messages.
   */
  async cleanupTrailingNonAssistantMessages(threadId: UUID): Promise<void> {
    try {
      const { thread: updatedThread } = await this.findThreadUseCase.execute(
        new FindThreadQuery(threadId),
      );

      const threadMessages = updatedThread.messages;
      if (threadMessages.length === 0) {
        this.logger.warn('Thread has no messages after save', { threadId });
        return;
      }

      await this.deleteMessagesUntilAssistant(threadId, threadMessages);
    } catch (error) {
      this.logger.error('Error during message cleanup', {
        threadId,
        error: error as Error,
      });
      // Don't throw - we want to gracefully handle cleanup failures
    }
  }

  /**
   * Deletes messages from the end of the thread until a "clean" assistant
   * message is found — one that does NOT contain tool_use content.
   * An assistant message with tool_use but no corresponding tool_result
   * would leave the conversation in an invalid state for providers like
   * Anthropic that require tool_use → tool_result pairing.
   */
  async deleteMessagesUntilAssistant(
    threadId: UUID,
    threadMessages: Message[],
  ): Promise<void> {
    const lastMessage = threadMessages[threadMessages.length - 1];
    if (
      lastMessage.role !== MessageRole.ASSISTANT ||
      this.hasToolUseContent(lastMessage)
    ) {
      const messagesToDelete: Message[] = [];
      for (let i = threadMessages.length - 1; i >= 0; i--) {
        const message = threadMessages[i];
        if (
          message.role === MessageRole.ASSISTANT &&
          !this.hasToolUseContent(message)
        ) {
          break;
        }
        messagesToDelete.push(message);
      }
      await this.deleteTrailingMessages(threadId, messagesToDelete);
    }
  }

  private hasToolUseContent(message: Message): boolean {
    return (
      message instanceof AssistantMessage &&
      message.content.some((c) => c instanceof ToolUseMessageContent)
    );
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
