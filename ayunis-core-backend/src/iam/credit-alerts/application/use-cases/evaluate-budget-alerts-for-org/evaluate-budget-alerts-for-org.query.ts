import type { UUID } from 'crypto';

export class EvaluateBudgetAlertsForOrgQuery {
  constructor(public readonly orgId: UUID) {}
}
