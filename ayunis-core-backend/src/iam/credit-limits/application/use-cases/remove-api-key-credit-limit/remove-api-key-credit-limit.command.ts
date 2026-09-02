import type { UUID } from 'crypto';

export class RemoveApiKeyCreditLimitCommand {
  constructor(public readonly apiKeyId: UUID) {}
}
