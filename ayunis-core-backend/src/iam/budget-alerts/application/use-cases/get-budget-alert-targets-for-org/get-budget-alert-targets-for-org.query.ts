import type { UUID } from 'crypto';

export class GetBudgetAlertTargetsForOrgQuery {
  constructor(public readonly orgId: UUID) {}
}
