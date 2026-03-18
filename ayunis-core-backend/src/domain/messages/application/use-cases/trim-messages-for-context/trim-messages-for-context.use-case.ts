import { Injectable, Logger } from '@nestjs/common';
import { CountTokensUseCase } from 'src/common/token-counter/application/use-cases/count-tokens/count-tokens.use-case';
import { CountTokensCommand } from 'src/common/token-counter/application/use-cases/count-tokens/count-tokens.command';
import { TokenCounterType } from 'src/common/token-counter/application/ports/token-counter.handler.port';
import { Message } from '../../../domain/message.entity';
import { MessageRole } from '../../../domain/value-objects/message-role.object';
import { AssistantMessage } from '../../../domain/messages/assistant-message.entity';
import { ToolUseMessageContent } from '../../../domain/message-contents/tool-use.message-content.entity';
import { TrimMessagesForContextCommand } from './trim-messages-for-context.command';
import { extractTextFromMessage } from '../../utils/message-text-extractor.util';

@Injectable()
export class TrimMessagesForContextUseCase {
  private readonly logger = new Logger(TrimMessagesForContextUseCase.name);

  constructor(private readonly countTokensUseCase: CountTokensUseCase) {}

  execute(command: TrimMessagesForContextCommand): Message[] {
    this.logger.log('execute', {
      messageCount: command.messages.length,
      maxTokens: command.maxTokens,
    });

    if (command.messages.length === 0) {
      return [];
    }

    // Sort messages by creation date (oldest first)
    const sortedMessages = [...command.messages].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );

    // Calculate tokens for each message
    const messagesWithTokens = sortedMessages.map((message) => ({
      message,
      tokens: this.countTokensForMessage(message, command.counterType),
    }));

    // Start from the end and work backwards, accumulating messages
    const selectedMessages: Message[] = [];
    let totalTokens = 0;

    for (let i = messagesWithTokens.length - 1; i >= 0; i--) {
      const { message, tokens } = messagesWithTokens[i];

      if (totalTokens + tokens <= command.maxTokens) {
        selectedMessages.unshift(message);
        totalTokens += tokens;
      } else {
        // Stop when we can't fit more messages
        break;
      }
    }

    // Ensure the first message is a user message and no tool_use is orphaned
    const withoutOrphanedToolUse =
      this.removeLeadingOrphanedToolPairs(selectedMessages);
    const trimmedMessages = this.ensureFirstMessageIsUser(
      withoutOrphanedToolUse,
    );

    this.logger.log('execute completed', {
      originalCount: command.messages.length,
      selectedCount: trimmedMessages.length,
      totalTokens,
    });

    return trimmedMessages;
  }

  private countTokensForMessage(
    message: Message,
    counterType?: TokenCounterType,
  ): number {
    const text = extractTextFromMessage(message.content);

    if (text.length === 0) {
      return 0;
    }

    return this.countTokensUseCase.execute(
      new CountTokensCommand(text, counterType),
    );
  }

  /**
   * After trimming, the first messages might be orphaned tool_result or
   * assistant(tool_use) blocks whose counterpart was trimmed away.
   * Drop leading messages until we reach a message that doesn't depend
   * on a missing predecessor.
   */
  private removeLeadingOrphanedToolPairs(messages: Message[]): Message[] {
    let startIndex = 0;
    while (startIndex < messages.length) {
      const msg = messages[startIndex];
      // A tool_result without a preceding tool_use — skip it
      if (msg.role === MessageRole.TOOL) {
        startIndex++;
        continue;
      }
      // An assistant message with tool_use followed by no tool_result — skip it
      if (
        msg instanceof AssistantMessage &&
        msg.content.some((c) => c instanceof ToolUseMessageContent) &&
        (startIndex + 1 >= messages.length ||
          messages[startIndex + 1].role !== MessageRole.TOOL)
      ) {
        startIndex++;
        continue;
      }
      break;
    }
    return startIndex > 0 ? messages.slice(startIndex) : messages;
  }

  private ensureFirstMessageIsUser(messages: Message[]): Message[] {
    if (messages.length === 0) {
      return [];
    }

    // Find the index of the first user message
    const firstUserIndex = messages.findIndex(
      (m) => m.role === MessageRole.USER,
    );

    if (firstUserIndex === -1) {
      // No user message found, return empty array
      this.logger.warn('No user message found in selected messages');
      return [];
    }

    if (firstUserIndex === 0) {
      // First message is already a user message
      return messages;
    }

    // Skip messages before the first user message
    return messages.slice(firstUserIndex);
  }
}
