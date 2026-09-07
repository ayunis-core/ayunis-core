import { useHasCreditBudget } from '@/features/credit-limits';
import { useTeamLimitOverview } from '@/features/credit-limits/api/useCreditLimitQueries';

export function useTeamCreditLimits() {
  const enabled = useHasCreditBudget();
  const query = useTeamLimitOverview(enabled);
  return {
    teamLimits: query.limits,
    isLoading: query.isPending,
    isError: query.isError,
  };
}
