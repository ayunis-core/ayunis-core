import { useUsageControllerGetCreditUsage } from '@/shared/api/generated/ayunisCoreAPI';

/**
 * True when the org has a usage-based credit budget (monthlyCredits set).
 * Self-hosted-safe — unlike the subscription type, this is not masked.
 * Gates where credit-limit actions appear (users kebab, team detail).
 */
export function useHasCreditBudget(): boolean {
  const { data } = useUsageControllerGetCreditUsage();
  return data?.monthlyCredits !== null && data?.monthlyCredits !== undefined;
}
