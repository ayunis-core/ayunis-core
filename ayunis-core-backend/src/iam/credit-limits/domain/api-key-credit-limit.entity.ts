import type { UUID } from 'crypto';
import type { CreditLimitParams } from './credit-limit.entity';
import { CreditLimit } from './credit-limit.entity';

export interface ApiKeyCreditLimitParams extends CreditLimitParams {
  apiKeyId: UUID;
}

export class ApiKeyCreditLimit extends CreditLimit {
  public readonly apiKeyId: UUID;

  constructor(params: ApiKeyCreditLimitParams) {
    super(params);
    this.apiKeyId = params.apiKeyId;
  }
}
