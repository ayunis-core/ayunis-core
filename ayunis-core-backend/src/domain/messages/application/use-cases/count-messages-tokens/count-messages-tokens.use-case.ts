import { Injectable, Logger } from '@nestjs/common';
import {
  budgetEstimator,
  countThreadTokens,
} from 'src/common/token-counter/application/util/context-budget.helper';
import { toBudgetParts } from 'src/domain/messages/application/utils/message-parts.util';
import { CountMessagesTokensCommand } from './count-messages-tokens.command';

// The warning uses a batched shared estimate; the provider-specific runtime
// budget remains authoritative for selecting history.
@Injectable()
export class CountMessagesTokensUseCase {
  private readonly logger = new Logger(CountMessagesTokensUseCase.name);

  execute(command: CountMessagesTokensCommand): number {
    this.logger.log({ messageCount: command.messages.length }, 'execute');
    return countThreadTokens(
      budgetEstimator(),
      command.messages.map(toBudgetParts),
    );
  }
}
