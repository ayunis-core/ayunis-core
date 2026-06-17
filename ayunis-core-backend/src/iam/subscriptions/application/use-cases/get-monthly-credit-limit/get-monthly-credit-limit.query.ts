import type { UUID } from 'crypto';

export class GetMonthlyCreditLimitQuery {
  constructor(public readonly orgId: UUID) {}
}
