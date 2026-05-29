import { useMemo, useState } from 'react';
import { getMonthDateRange } from '@/shared/lib/getMonthDateRange';
import { UsageStatsCardsWidget } from '@/widgets/usage-stats-cards';
import { ProviderConsumptionWidget } from '@/widgets/provider-consumption-chart';
import { ModelDistributionWidget } from '@/widgets/model-distribution-chart';
import { buildModelFilterOptions } from '../lib/buildModelFilterOptions';
import { CreditBudgetCard } from './CreditBudgetCard';
import { UsageOverviewFilters } from './UsageOverviewFilters';
import { UserUsageSection } from './UserUsageSection';
import type { UsageOverviewHooks } from '../model/types';

interface UsageOverviewProps {
  hooks: UsageOverviewHooks;
}

/**
 * Consolidated, credit-centric usage view shared by the org-admin (own org)
 * and super-admin (specific org) surfaces. The month picker drives the stats,
 * charts, and per-user table; the credit budget card reflects the current
 * month only. Data access is injected via `hooks` so each surface calls its
 * own generated endpoints.
 */
export function UsageOverview({ hooks }: Readonly<UsageOverviewProps>) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedProvider, setSelectedProvider] = useState<
    string | undefined
  >();
  const [selectedModel, setSelectedModel] = useState<string | undefined>();

  const { startDate, endDate } = getMonthDateRange(year, month);
  const startIso = startDate.toISOString();
  const endIso = endDate.toISOString();

  const handleMonthChange = (newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
  };

  const creditUsage = hooks.useCreditUsage();
  const { data: permittedModels } = hooks.usePermittedModels();
  const { providerOptions, modelOptions, providerDisplayNames } = useMemo(
    () => buildModelFilterOptions(permittedModels),
    [permittedModels],
  );

  const { data: stats, isLoading: statsLoading } = hooks.useUsageStats({
    startDate: startIso,
    endDate: endIso,
  });
  const {
    data: providerChart,
    isLoading: providerLoading,
    error: providerError,
  } = hooks.useProviderUsageChart({
    startDate: startIso,
    endDate: endIso,
    provider: selectedProvider,
  });
  const {
    data: modelDistribution,
    isLoading: modelLoading,
    error: modelError,
  } = hooks.useModelDistribution({
    startDate: startIso,
    endDate: endIso,
    modelId: selectedModel,
  });

  return (
    <div className="space-y-8">
      <CreditBudgetCard creditUsage={creditUsage} />

      <UsageOverviewFilters
        year={year}
        month={month}
        onMonthChange={handleMonthChange}
        selectedProvider={selectedProvider}
        onProviderChange={setSelectedProvider}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        providerOptions={providerOptions}
        modelOptions={modelOptions}
      />

      <UsageStatsCardsWidget stats={stats} isLoading={statsLoading} />

      <ProviderConsumptionWidget
        timeSeries={providerChart?.timeSeries}
        providerDisplayNames={providerDisplayNames}
        isLoading={providerLoading}
        error={providerError}
      />

      <ModelDistributionWidget
        models={modelDistribution?.models}
        isLoading={modelLoading}
        error={modelError}
      />

      <UserUsageSection
        key={`${year}-${month}`}
        useUserUsage={hooks.useUserUsage}
        startDate={startIso}
        endDate={endIso}
      />
    </div>
  );
}
