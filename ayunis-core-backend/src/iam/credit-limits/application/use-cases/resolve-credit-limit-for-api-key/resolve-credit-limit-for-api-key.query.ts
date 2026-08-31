import type { UUID } from 'crypto';

export class ResolveCreditLimitForApiKeyQuery {
  constructor(
    public readonly orgId: UUID,
    public readonly apiKeyId: UUID,
  ) {}
}
