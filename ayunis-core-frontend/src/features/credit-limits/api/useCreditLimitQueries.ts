import { useMemo } from 'react';
import {
  useCreditLimitsControllerGetTeamLimits,
  useCreditLimitsControllerGetUserLimits,
  useUsageControllerGetCreditUsage,
} from '@/shared/api';

export function useCreditLimitBudget() {
  const query = useUsageControllerGetCreditUsage();
  return {
    ...query,
    hasBudget: typeof query.data?.monthlyCredits === 'number',
  };
}

export function useUserLimitOverview(enabled: boolean) {
  const query = useCreditLimitsControllerGetUserLimits({ query: { enabled } });
  const limits = useMemo(
    () => new Map(query.data?.map((limit) => [limit.userId, limit])),
    [query.data],
  );
  return { ...query, limits };
}

export function useTeamLimitOverview(enabled: boolean) {
  const query = useCreditLimitsControllerGetTeamLimits({ query: { enabled } });
  const limits = useMemo(
    () => new Map(query.data?.map((limit) => [limit.teamId, limit])),
    [query.data],
  );
  return { ...query, limits };
}
