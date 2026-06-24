import type {
  UsageStatsResponseDto,
  ModelDistributionResponseDto,
  ProviderUsageChartResponseDto,
  UserUsageResponseDto,
} from '@/shared/api';

/** Current-month credit budget summary (already derived for display). */
export interface CreditUsageView {
  monthlyCredits: number;
  creditsUsed: number;
  creditsRemaining: number;
  usagePercent: number;
  /** Whether the org has a usage-based subscription (i.e. a credit budget). */
  hasSubscription: boolean;
  isLoading: boolean;
  isError: boolean;
}

export interface DateRangeParams {
  startDate?: string;
  endDate?: string;
}

export interface UserUsageQueryParams extends DateRangeParams {
  limit: number;
  offset: number;
}

interface QueryResult<T> {
  data?: T;
  isLoading: boolean;
  error: unknown;
}

/** Minimal permitted-model shape needed to build the provider/model filters. */
export interface PermittedModelOption {
  id: string;
  provider: string;
  providerDisplayName: string;
  displayName: string;
}

/**
 * Pre-bound data hooks for the consolidated usage view. Each surface (org admin
 * for its own org, super admin for a specific org) supplies an adapter that
 * calls its own generated hooks, so the widget never sees an orgId and each
 * adapter hook is always invoked unconditionally (rules-of-hooks safe).
 */
export interface UsageOverviewHooks {
  useCreditUsage: () => CreditUsageView;
  useUsageStats: (params: DateRangeParams) => {
    data?: UsageStatsResponseDto;
    isLoading: boolean;
  };
  useModelDistribution: (
    params: DateRangeParams & { modelId?: string },
  ) => QueryResult<ModelDistributionResponseDto>;
  useProviderUsageChart: (
    params: DateRangeParams & { provider?: string },
  ) => QueryResult<ProviderUsageChartResponseDto>;
  useUserUsage: (
    params: UserUsageQueryParams,
  ) => QueryResult<UserUsageResponseDto>;
  usePermittedModels: () => { data?: PermittedModelOption[] };
}
