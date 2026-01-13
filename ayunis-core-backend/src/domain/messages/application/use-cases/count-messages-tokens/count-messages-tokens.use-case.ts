import { Injectable, Logger } from '@nestjs/common';
import { CountTokensUseCase } from 'src/common/token-counter/application/use-cases/count-tokens/count-tokens.use-case';
import { CountTokensCommand } from 'src/common/token-counter/application/use-cases/count-tokens/count-tokens.command';
import { CountMessagesTokensCommand } from './count-messages-tokens.command';
import { extractTextFromContent } from '../../utils/message-text-extractor.util';

@Injectable()
export class CountMessagesTokensUseCase {
  private readonly logger = new Logger(CountMessagesTokensUseCase.name);

  constructor(private readonly countTokensUseCase: CountTokensUseCase) {}

  execute(command: CountMessagesTokensCommand): number {
    this.logger.log('execute', { messageCount: command.messages.length });

    const allText = command.messages
      .flatMap((message) => message.content)
      .map((content) => extractTextFromContent(content))
      .filter((text) => text.length > 0)
      .join('\n');

    if (allText.length === 0) {
      return 0;
    }

    return this.countTokensUseCase.execute(
      new CountTokensCommand(allText, command.counterType),
    );
  }
}
