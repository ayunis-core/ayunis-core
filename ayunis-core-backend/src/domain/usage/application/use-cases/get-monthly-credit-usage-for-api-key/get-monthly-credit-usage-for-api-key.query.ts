import type { UUID } from 'crypto';

export class GetMonthlyCreditUsageForApiKeyQuery {
  constructor(
    public readonly organizationId: UUID,
    public readonly apiKeyId: UUID,
    public readonly since?: Date,
  ) {}
}
