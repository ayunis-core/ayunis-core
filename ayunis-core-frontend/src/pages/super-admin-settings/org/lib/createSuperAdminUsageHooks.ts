import { computeUsagePercent } from '@/shared/lib/computeUsagePercent';
import type {
  UsageOverviewHooks,
  CreditUsageView,
} from '@/widgets/usage-overview';
import { useSuperAdminUsageStats } from '@/pages/super-admin-settings/org/api/useSuperAdminUsageStats';
import { useSuperAdminModelDistribution } from '@/pages/super-admin-settings/org/api/useSuperAdminModelDistribution';
import { useSuperAdminProviderUsageChart } from '@/pages/super-admin-settings/org/api/useSuperAdminProviderUsageChart';
import { useSuperAdminUserUsage } from '@/pages/super-admin-settings/org/api/useSuperAdminUserUsage';
import { useSuperAdminApiKeyUsage } from '@/pages/super-admin-settings/org/api/useSuperAdminApiKeyUsage';
import useSuperAdminCreditUsage from '@/pages/super-admin-settings/org/api/useSuperAdminCreditUsage';
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
    useApiKeyUsage: (params) => useSuperAdminApiKeyUsage(orgId, params),
    usePermittedModels: () =>
      useSuperAdminPermittedModelsControllerGetPermittedModels(orgId),
  };
}
