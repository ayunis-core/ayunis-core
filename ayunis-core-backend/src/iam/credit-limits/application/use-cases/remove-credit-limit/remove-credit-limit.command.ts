import type { UUID } from 'crypto';
import type { CreditLimitScope } from '../../../domain/value-objects/credit-limit-scope.enum';

export class RemoveCreditLimitCommand {
  constructor(
    public readonly scope: CreditLimitScope,
    public readonly targetId: UUID,
  ) {}
}
