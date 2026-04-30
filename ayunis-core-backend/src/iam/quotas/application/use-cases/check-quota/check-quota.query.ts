import type { QuotaType } from '../../../domain/quota-type.enum';
import type { PrincipalRef } from '../../../domain/principal-ref';

export class CheckQuotaQuery {
  constructor(
    public readonly principal: PrincipalRef,
    public readonly quotaType: QuotaType,
  ) {}
}
