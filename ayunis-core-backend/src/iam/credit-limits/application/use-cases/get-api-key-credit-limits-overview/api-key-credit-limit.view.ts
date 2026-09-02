import type { UUID } from 'crypto';

export interface ApiKeyCreditLimitOverviewItem {
  apiKeyId: UUID;
  name: string;
  monthlyCredits: number;
  creditsUsed: number;
}
