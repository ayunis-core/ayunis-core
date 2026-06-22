import type { UUID } from 'crypto';
import type { CreditLimitParams } from './credit-limit.entity';
import { CreditLimit } from './credit-limit.entity';

export interface UserCreditLimitParams extends CreditLimitParams {
  userId: UUID;
}

export class UserCreditLimit extends CreditLimit {
  public readonly userId: UUID;

  constructor(params: UserCreditLimitParams) {
    super(params);
    this.userId = params.userId;
  }
}
