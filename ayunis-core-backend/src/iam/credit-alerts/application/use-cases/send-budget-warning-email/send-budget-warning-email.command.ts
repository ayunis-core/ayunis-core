import type { BudgetWarningScope } from 'src/common/email-templates/domain/value-objects/budget-warning-scope.enum';

export class SendBudgetWarningEmailCommand {
  public readonly recipientName: string | null;
  public readonly recipientEmail: string;
  public readonly scope: BudgetWarningScope;
  public readonly targetName: string;
  public readonly threshold: number;
  public readonly percentUsed: number;
  public readonly creditsUsed: number;
  public readonly monthlyCredits: number;

  constructor(params: {
    recipientName: string | null;
    recipientEmail: string;
    scope: BudgetWarningScope;
    targetName: string;
    threshold: number;
    percentUsed: number;
    creditsUsed: number;
    monthlyCredits: number;
  }) {
    this.recipientName = params.recipientName;
    this.recipientEmail = params.recipientEmail;
    this.scope = params.scope;
    this.targetName = params.targetName;
    this.threshold = params.threshold;
    this.percentUsed = params.percentUsed;
    this.creditsUsed = params.creditsUsed;
    this.monthlyCredits = params.monthlyCredits;
  }
}
