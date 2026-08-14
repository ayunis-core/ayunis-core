import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CountTokensUseCase } from 'src/common/token-counter/application/use-cases/count-tokens/count-tokens.use-case';
import { CountTokensCommand } from 'src/common/token-counter/application/use-cases/count-tokens/count-tokens.command';
import { CountMessagesTokensCommand } from './count-messages-tokens.command';
import { extractTextFromContent } from '../../utils/message-text-extractor.util';

@Injectable()
export class CountMessagesTokensUseCase {
  constructor(
    private readonly countTokensUseCase: CountTokensUseCase,
    @InjectPinoLogger(CountMessagesTokensUseCase.name)
    private readonly logger: PinoLogger,
  ) {}

  execute(command: CountMessagesTokensCommand): number {
    this.logger.info({ messageCount: command.messages.length }, 'execute');

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
