import { useUsageControllerGetCreditUsage } from '@/shared/api/generated/ayunisCoreAPI';

export function useHasCreditBudget(): boolean {
  const { data } = useUsageControllerGetCreditUsage();
  return data?.monthlyCredits !== null && data?.monthlyCredits !== undefined;
}
