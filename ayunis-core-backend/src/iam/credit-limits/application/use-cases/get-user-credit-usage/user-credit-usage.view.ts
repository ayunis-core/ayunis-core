import type { UUID } from 'crypto';

export interface UserCreditUsageItem {
  userId: UUID;
  creditsUsed?: number;
}
