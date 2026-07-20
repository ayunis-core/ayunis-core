import type { UUID } from 'crypto';
import type { QuotaType } from 'src/iam/quotas/domain/quota-type.enum';

export class CheckQuotaQuery {
  constructor(
    public readonly userId: UUID,
    public readonly orgId: UUID,
    public readonly quotaType: QuotaType,
  ) {}
}
