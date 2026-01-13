import { Injectable, Logger } from '@nestjs/common';
import { TokenCounterRegistry } from '../../token-counter.registry';
import { CountTokensCommand } from './count-tokens.command';

@Injectable()
export class CountTokensUseCase {
  private readonly logger = new Logger(CountTokensUseCase.name);

  constructor(private readonly registry: TokenCounterRegistry) {}

  execute(command: CountTokensCommand): number {
    this.logger.debug('execute', { textLength: command.text.length });

    const handler = command.counterType
      ? this.registry.getHandler(command.counterType)
      : this.registry.getDefaultHandler();

    return handler.countTokens(command.text);
  }
}
