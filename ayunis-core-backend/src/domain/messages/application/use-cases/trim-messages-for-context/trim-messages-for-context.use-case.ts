import { Injectable, Logger } from '@nestjs/common';
import { CountTokensUseCase } from 'src/common/token-counter/application/use-cases/count-tokens/count-tokens.use-case';
import { CountTokensCommand } from 'src/common/token-counter/application/use-cases/count-tokens/count-tokens.command';
import { TokenCounterType } from 'src/common/token-counter/application/ports/token-counter.handler.port';
import { Message } from '../../../domain/message.entity';
import { MessageRole } from '../../../domain/value-objects/message-role.object';
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

    // Ensure the first message is a user message
    const trimmedMessages = this.ensureFirstMessageIsUser(selectedMessages);

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
