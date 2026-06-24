import { computeUsagePercent } from '@/shared/lib/computeUsagePercent';
import type {
  UsageOverviewHooks,
  CreditUsageView,
} from '@/widgets/usage-overview';
import { useSuperAdminUsageStats } from '../api/useSuperAdminUsageStats';
import { useSuperAdminModelDistribution } from '../api/useSuperAdminModelDistribution';
import { useSuperAdminProviderUsageChart } from '../api/useSuperAdminProviderUsageChart';
import { useSuperAdminUserUsage } from '../api/useSuperAdminUserUsage';
import useSuperAdminCreditUsage from '../api/useSuperAdminCreditUsage';
import { useSuperAdminPermittedModelsControllerGetPermittedModels } from '@/shared/api';

function useSuperAdminCreditUsageView(orgId: string): CreditUsageView {
  const { creditUsage, isLoading, isError } = useSuperAdminCreditUsage({
    orgId,
  });

  const monthlyCredits = creditUsage?.monthlyCredits ?? 0;
  const creditsUsed = creditUsage?.creditsUsed ?? 0;
  const creditsRemaining = Math.max(0, creditUsage?.creditsRemaining ?? 0);

  return {
    monthlyCredits,
    creditsUsed,
    creditsRemaining,
    usagePercent: computeUsagePercent(creditsUsed, monthlyCredits),
    hasSubscription:
      !isLoading &&
      !isError &&
      creditUsage?.monthlyCredits !== null &&
      creditUsage?.monthlyCredits !== undefined,
    isLoading,
    isError,
  };
}

/**
 * Builds the UsageOverview data adapter for a super admin viewing a specific
 * organization. Each hook binds the orgId to the org-scoped super-admin
 * endpoints; the widget itself never sees the orgId.
 */
export function createSuperAdminUsageHooks(orgId: string): UsageOverviewHooks {
  return {
    useCreditUsage: () => useSuperAdminCreditUsageView(orgId),
    useUsageStats: (params) => useSuperAdminUsageStats(orgId, params),
    useModelDistribution: (params) =>
      useSuperAdminModelDistribution(orgId, params),
    useProviderUsageChart: (params) =>
      useSuperAdminProviderUsageChart(orgId, params),
    useUserUsage: (params) => useSuperAdminUserUsage(orgId, params),
    usePermittedModels: () =>
      useSuperAdminPermittedModelsControllerGetPermittedModels(orgId),
  };
}
