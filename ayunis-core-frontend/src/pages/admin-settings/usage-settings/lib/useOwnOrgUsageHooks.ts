import {
  useUsageControllerGetUsageStats,
  useUsageControllerGetModelDistribution,
  useUsageControllerGetProviderUsageChart,
  useUsageControllerGetUserUsage,
  useModelsControllerGetPermittedLanguageModels,
} from '@/shared/api';
import type { UsageOverviewHooks } from '@/widgets/usage-overview';
import { useCreditUsage } from '../api/useCreditUsage';

/**
 * UsageOverview data adapter for the org admin's own organization. Each hook
 * maps to the org-scoped /usage/* endpoints (orgId derived from the session).
 */
export const ownOrgUsageHooks: UsageOverviewHooks = {
  useCreditUsage,
  useUsageStats: (params) => useUsageControllerGetUsageStats(params),
  useModelDistribution: (params) =>
    useUsageControllerGetModelDistribution(params),
  useProviderUsageChart: (params) =>
    useUsageControllerGetProviderUsageChart(params),
  useUserUsage: (params) => useUsageControllerGetUserUsage(params),
  usePermittedModels: () => useModelsControllerGetPermittedLanguageModels(),
};
