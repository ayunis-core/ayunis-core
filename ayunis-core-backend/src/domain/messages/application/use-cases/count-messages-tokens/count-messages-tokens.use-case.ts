import { Injectable, Logger } from '@nestjs/common';
import {
  budgetEstimator,
  countThreadTokens,
} from 'src/common/token-counter/application/util/context-budget.helper';
import { toMessageParts } from 'src/domain/messages/application/utils/message-parts.util';
import { CountMessagesTokensCommand } from './count-messages-tokens.command';

/**
 * Prices a thread with the context budget's rules and the shared estimate in
 * one tokenizer call, so the long-chat warning tracks the trimming without
 * paying a tokenizer round trip per message on every thread fetch.
 */
@Injectable()
export class CountMessagesTokensUseCase {
  private readonly logger = new Logger(CountMessagesTokensUseCase.name);

  execute(command: CountMessagesTokensCommand): number {
    this.logger.log({ messageCount: command.messages.length }, 'execute');
    return countThreadTokens(
      budgetEstimator(),
      command.messages.map(toMessageParts),
    );
  }
}
