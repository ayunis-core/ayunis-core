import type { UUID } from 'crypto';

export class CheckCreditBudgetQuery {
  constructor(public readonly orgId: UUID) {}
}
