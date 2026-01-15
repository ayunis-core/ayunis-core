import { UUID } from 'crypto';
import { QuotaType } from '../../../domain/quota-type.enum';

export class CheckQuotaQuery {
  constructor(
    public readonly userId: UUID,
    public readonly quotaType: QuotaType,
  ) {}
}
