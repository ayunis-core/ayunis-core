import type { UUID } from 'crypto';

export class TokensConsumedEvent {
  static readonly EVENT_NAME = 'run.tokens-consumed';

  constructor(
    public readonly userId: UUID | undefined,
    public readonly apiKeyId: UUID | undefined,
    public readonly orgId: UUID | undefined,
    public readonly model: string,
    public readonly provider: string,
    public readonly inputTokens: number,
    public readonly outputTokens: number,
  ) {}
}
