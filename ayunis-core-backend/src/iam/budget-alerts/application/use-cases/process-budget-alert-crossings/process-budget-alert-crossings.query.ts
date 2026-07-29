import type { UUID } from 'crypto';
import type { BudgetTarget } from '../../utils/budget-alert-crossing';

export class ProcessBudgetAlertCrossingsQuery {
  constructor(
    public readonly orgId: UUID,
    public readonly periodStart: Date,
    public readonly targets: BudgetTarget[],
  ) {}
}
