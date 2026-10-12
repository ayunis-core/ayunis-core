import type { TeamCreditLimitOverviewItem } from 'src/iam/credit-limits/application/use-cases/get-team-credit-limits-overview/team-credit-limit.view';

export type AdminTeamCreditLimitOverviewItem = Omit<
  TeamCreditLimitOverviewItem,
  'creditsUsed'
> & { creditsUsed?: number };
