import { useUsageControllerGetCreditUsage } from '@/shared/api';
import { computeUsagePercent } from '@/shared/lib/computeUsagePercent';

export function useCreditUsage() {
  const { data, isLoading, isError } = useUsageControllerGetCreditUsage();

  const monthlyCredits = data?.monthlyCredits ?? 0;
  const creditsUsed = data?.creditsUsed ?? 0;
  const creditsRemaining = Math.max(0, data?.creditsRemaining ?? 0);
  const usagePercent = computeUsagePercent(creditsUsed, monthlyCredits);
  const hasSubscription =
    !isLoading &&
    !isError &&
    data?.monthlyCredits !== null &&
    data?.monthlyCredits !== undefined;

  return {
    monthlyCredits,
    creditsUsed,
    creditsRemaining,
    usagePercent,
    hasSubscription,
    isLoading,
    isError,
  };
}
