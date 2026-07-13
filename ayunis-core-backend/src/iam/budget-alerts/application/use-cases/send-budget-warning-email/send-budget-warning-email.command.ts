import type { BudgetWarningScope } from 'src/common/email-templates/domain/value-objects/budget-warning-scope.enum';

export class SendBudgetWarningEmailCommand {
  public readonly recipientName: string | null;
  public readonly recipientEmail: string;
  public readonly scope: BudgetWarningScope;
  public readonly targetName: string;
  public readonly threshold: number;

  constructor(params: {
    recipientName: string | null;
    recipientEmail: string;
    scope: BudgetWarningScope;
    targetName: string;
    threshold: number;
  }) {
    this.recipientName = params.recipientName;
    this.recipientEmail = params.recipientEmail;
    this.scope = params.scope;
    this.targetName = params.targetName;
    this.threshold = params.threshold;
  }
}
