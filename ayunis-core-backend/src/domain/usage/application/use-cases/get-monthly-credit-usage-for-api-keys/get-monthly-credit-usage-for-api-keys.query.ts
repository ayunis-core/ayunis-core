import type { UUID } from 'crypto';

export class GetMonthlyCreditUsageForApiKeysQuery {
  constructor(
    public readonly organizationId: UUID,
    public readonly apiKeyIds: UUID[],
    public readonly since?: Date,
  ) {}
}
