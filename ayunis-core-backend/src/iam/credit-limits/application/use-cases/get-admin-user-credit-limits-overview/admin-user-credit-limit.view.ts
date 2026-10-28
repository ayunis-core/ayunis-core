import type { UserCreditLimitOverviewItem } from 'src/iam/credit-limits/application/use-cases/get-user-credit-limits-overview/user-credit-limit.view';

export type AdminUserCreditLimitOverviewItem = Omit<
  UserCreditLimitOverviewItem,
  'creditsUsed'
> & { creditsUsed?: number };
