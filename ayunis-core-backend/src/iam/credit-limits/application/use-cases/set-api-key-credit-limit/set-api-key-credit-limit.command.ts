import type { UUID } from 'crypto';

export class SetApiKeyCreditLimitCommand {
  constructor(
    public readonly apiKeyId: UUID,
    public readonly monthlyCredits: number,
  ) {}
}
