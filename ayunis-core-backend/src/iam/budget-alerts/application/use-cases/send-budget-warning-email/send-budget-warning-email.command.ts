import type { UUID } from 'crypto';
import type { BudgetWarningScope } from 'src/common/email-templates/domain/value-objects/budget-warning-scope.enum';

export class SendBudgetWarningEmailCommand {
  public readonly recipientName: string | null;
  public readonly recipientEmail: string;
  public readonly scope: BudgetWarningScope;
  public readonly targetId: UUID;
  public readonly targetName: string;
  public readonly threshold: number;

  constructor(params: {
    recipientName: string | null;
    recipientEmail: string;
    scope: BudgetWarningScope;
    targetId: UUID;
    targetName: string;
    threshold: number;
  }) {
    this.recipientName = params.recipientName;
    this.recipientEmail = params.recipientEmail;
    this.scope = params.scope;
    this.targetId = params.targetId;
    this.targetName = params.targetName;
    this.threshold = params.threshold;
  }
}
