import { useMemo } from 'react';
import { useCreditLimitsControllerGetOverview } from '@/shared/api/generated/ayunisCoreAPI';

export interface CreditLimitInfo {
  monthlyCredits: number;
  creditsUsed: number;
}

export function useCreditLimits() {
  const { data, isLoading } = useCreditLimitsControllerGetOverview();

  const userLimits = useMemo(
    () =>
      new Map<string, CreditLimitInfo>(
        (data?.users ?? []).map((u) => [
          u.userId,
          { monthlyCredits: u.monthlyCredits, creditsUsed: u.creditsUsed },
        ]),
      ),
    [data],
  );

  const teamLimits = useMemo(
    () =>
      new Map<string, CreditLimitInfo>(
        (data?.teams ?? []).map((team) => [
          team.teamId,
          {
            monthlyCredits: team.monthlyCredits,
            creditsUsed: team.creditsUsed,
          },
        ]),
      ),
    [data],
  );

  return { userLimits, teamLimits, isLoading };
}
