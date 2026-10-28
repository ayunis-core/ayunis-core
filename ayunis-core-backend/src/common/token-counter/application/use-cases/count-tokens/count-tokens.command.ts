import type { TokenCounterType } from 'src/common/token-counter/application/ports/token-counter.handler.port';

export class CountTokensCommand {
  constructor(
    public readonly text: string,
    public readonly counterType?: TokenCounterType,
  ) {}
}
