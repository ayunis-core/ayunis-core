import type { UUID } from 'crypto';

export class UpdateMonthlyCreditsCommand {
  public readonly orgId: UUID;
  public readonly requestingUserId: UUID;
  public readonly monthlyCredits: number;

  constructor(params: {
    orgId: UUID;
    requestingUserId: UUID;
    monthlyCredits: number;
  }) {
    this.orgId = params.orgId;
    this.requestingUserId = params.requestingUserId;
    this.monthlyCredits = params.monthlyCredits;
  }
}
