import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { TokenCounterRegistry } from '../../token-counter.registry';
import { CountTokensCommand } from './count-tokens.command';

@Injectable()
export class CountTokensUseCase {
  constructor(
    @InjectPinoLogger(CountTokensUseCase.name)
    private readonly logger: PinoLogger,
    private readonly registry: TokenCounterRegistry,
  ) {}

  execute(command: CountTokensCommand): number {
    this.logger.debug({ textLength: command.text.length }, 'execute');

    const handler = command.counterType
      ? this.registry.getHandler(command.counterType)
      : this.registry.getDefaultHandler();

    return handler.countTokens(command.text);
  }
}
