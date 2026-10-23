import type { UUID } from 'crypto';

export class UpdateApiKeyCommand {
  constructor(
    public readonly apiKeyId: UUID,
    public readonly changes: {
      name?: string;
      description?: string | null;
      expiresAt?: Date | null;
    },
  ) {}
}
