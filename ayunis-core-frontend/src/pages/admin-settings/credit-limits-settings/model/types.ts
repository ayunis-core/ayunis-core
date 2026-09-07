import type { CreditLimitInfo } from '@/features/credit-limits/model/credit-limit-settings';

export interface CreditLimitRow {
  id: string;
  name: string;
  email?: string;
  limit: CreditLimitInfo | null;
}
