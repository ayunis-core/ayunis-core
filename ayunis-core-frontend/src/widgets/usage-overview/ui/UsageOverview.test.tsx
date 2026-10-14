import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UsageOverview } from './UsageOverview';
import type { UsageOverviewHooks } from '@/widgets/usage-overview/model/types';

vi.mock('@/widgets/usage-stats-cards', () => ({
  UsageStatsCardsWidget: () => <div data-testid="aggregate-stats" />,
}));
vi.mock('@/widgets/provider-consumption-chart', () => ({
  ProviderConsumptionWidget: () => null,
}));
vi.mock('@/widgets/model-distribution-chart', () => ({
  ModelDistributionWidget: () => null,
}));
vi.mock('./CreditBudgetCard', () => ({ CreditBudgetCard: () => null }));
vi.mock('./UsageOverviewFilters', () => ({ UsageOverviewFilters: () => null }));
vi.mock('./UserUsageSection', () => ({
  UserUsageSection: ({ useUserUsage }: { useUserUsage: () => unknown }) => {
    useUserUsage();
    return <div data-testid="individual-usage" />;
  },
}));
vi.mock('./ApiKeyUsageSection', () => ({
  ApiKeyUsageSection: () => <div data-testid="api-key-usage" />,
}));
afterEach(cleanup);
const query = () => ({ data: undefined, isLoading: false });
const useUserUsage = vi.fn(query);
const hooks = {
  useCreditUsage: query,
  usePermittedModels: query,
  useUsageStats: query,
  useProviderUsageChart: query,
  useModelDistribution: query,
  useUserUsage,
  useApiKeyUsage: query,
} as unknown as UsageOverviewHooks;

describe('UsageOverview individual usage visibility', () => {
  it('removes the section and its request entirely while preserving aggregate stats', () => {
    useUserUsage.mockClear();
    render(<UsageOverview hooks={hooks} showIndividualUsage={false} />);
    expect(screen.queryByTestId('individual-usage')).toBeNull();
    expect(useUserUsage).not.toHaveBeenCalled();
    expect(screen.getByTestId('aggregate-stats')).toBeTruthy();
    expect(screen.getByTestId('api-key-usage')).toBeTruthy();
  });
  it('keeps individual usage visible by default for super-admin views', () => {
    render(<UsageOverview hooks={hooks} />);
    expect(screen.getByTestId('individual-usage')).toBeTruthy();
  });
});
