import type { TokenCounterType } from '../../ports/token-counter.handler.port';

export class CountTokensCommand {
  constructor(
    public readonly text: string,
    public readonly counterType?: TokenCounterType,
  ) {}
}
