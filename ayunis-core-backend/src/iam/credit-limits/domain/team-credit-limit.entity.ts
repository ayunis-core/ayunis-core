import type { UUID } from 'crypto';
import type { CreditLimitParams } from './credit-limit.entity';
import { CreditLimit } from './credit-limit.entity';

export interface TeamCreditLimitParams extends CreditLimitParams {
  teamId: UUID;
}

export class TeamCreditLimit extends CreditLimit {
  public readonly teamId: UUID;

  constructor(params: TeamCreditLimitParams) {
    super(params);
    this.teamId = params.teamId;
  }
}
