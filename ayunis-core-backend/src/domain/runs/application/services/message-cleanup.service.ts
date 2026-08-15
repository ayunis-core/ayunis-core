import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UUID } from 'crypto';
import { Message } from 'src/domain/messages/domain/message.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { DeleteMessageUseCase } from 'src/domain/messages/application/use-cases/delete-message/delete-message.use-case';
import { DeleteMessageCommand } from 'src/domain/messages/application/use-cases/delete-message/delete-message.command';
import { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import { FindThreadQuery } from 'src/domain/threads/application/use-cases/find-thread/find-thread.query';

/**
 * Cleans up threads after a failed or interrupted run.
 * Rolls back the incomplete turn to the most recent assistant response that
 * contains no tool calls.
 *
 * Only called on the error path — successful runs leave the thread in a
 * valid state by design.
 */
@Injectable()
export class MessageCleanupService {
  constructor(
    private readonly findThreadUseCase: FindThreadUseCase,
    private readonly deleteMessageUseCase: DeleteMessageUseCase,
    @InjectPinoLogger(MessageCleanupService.name)
    private readonly logger: PinoLogger,
  ) {}

  async cleanupTrailingNonAssistantMessages(threadId: UUID): Promise<void> {
    try {
      const { thread: updatedThread } = await this.findThreadUseCase.execute(
        new FindThreadQuery(threadId),
      );

      const threadMessages = updatedThread.messages;
      if (threadMessages.length === 0) {
        this.logger.warn({ threadId }, 'Thread has no messages after save');
        return;
      }

      await this.deleteMessagesUntilAssistant(threadId, threadMessages);
    } catch (error) {
      this.logger.error(
        {
          threadId,
          err: error as Error,
        },
        'Error during message cleanup',
      );
      // Don't throw - we want to gracefully handle cleanup failures
    }
  }

  async deleteMessagesUntilAssistant(
    threadId: UUID,
    threadMessages: Message[],
  ): Promise<void> {
    await this.deleteTrailingMessages(
      threadId,
      findFailedTurnMessages(threadMessages),
    );
  }

  async deleteTrailingMessages(
    threadId: UUID,
    messages: Message[],
  ): Promise<void> {
    if (messages.length === 0) return;

    this.logger.info(
      {
        threadId,
        count: messages.length,
        messageIds: messages.map((m) => m.id),
      },
      'Deleting trailing messages',
    );

    for (const message of messages) {
      try {
        await this.deleteMessageUseCase.execute(
          new DeleteMessageCommand(message.id),
        );
        this.logger.debug(
          {
            messageId: message.id,
            role: message.role,
          },
          'Deleted trailing message',
        );
      } catch (error) {
        this.logger.error(
          {
            messageId: message.id,
            role: message.role,
            err: error as Error,
          },
          'Failed to delete trailing message',
        );
        // Continue with cleanup even if one deletion fails
      }
    }

    this.logger.info(
      {
        threadId,
        deletedCount: messages.length,
      },
      'Successfully cleaned up trailing messages',
    );
  }
}

function findFailedTurnMessages(messages: readonly Message[]): Message[] {
  const completedTurnIndex = messages.findLastIndex(isCompletedAssistantTurn);
  return messages.slice(completedTurnIndex + 1).reverse();
}

function isCompletedAssistantTurn(message: Message): boolean {
  return (
    message instanceof AssistantMessage &&
    !message.content.some((content) => content instanceof ToolUseMessageContent)
  );
}
