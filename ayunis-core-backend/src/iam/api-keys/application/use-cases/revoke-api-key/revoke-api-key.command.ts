import type { UUID } from 'crypto';

export class RevokeApiKeyCommand {
  constructor(public readonly apiKeyId: UUID) {}
}
