import { useUsageControllerGetCreditUsage } from '@/shared/api/generated/ayunisCoreAPI';

/**
 * `GET /usage/credits` is admin-only, so callers rendered for non-admins must
 * pass `enabled: false` — otherwise the request 403s on every mount.
 */
export function useHasCreditBudget(enabled = true): boolean {
  const { data } = useUsageControllerGetCreditUsage({ query: { enabled } });
  return data?.monthlyCredits !== null && data?.monthlyCredits !== undefined;
}
