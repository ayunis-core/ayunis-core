import { useTranslation } from 'react-i18next';
import SettingsLayout from '../../admin-settings-layout';
import { UsageStatsCards } from './UsageStatsCards';
import { ProviderConsumption } from '@/pages/admin-settings/usage-settings/ui/provider-consumption-chart';
import { ModelDistribution } from '@/pages/admin-settings/usage-settings/ui/model-distribution-chart';
import { UserUsageTable } from '@/pages/admin-settings/usage-settings/ui/user-usage-table';
import { UsageFilters } from './UsageFilters';
import { useState } from 'react';

export default function UsageSettingsPage() {
  const { t } = useTranslation('admin-settings-layout');
  const [dateRange, setDateRange] = useState<{
    startDate?: Date;
    endDate?: Date;
  }>({});
  const [selectedProvider, setSelectedProvider] = useState<
    string | undefined
  >();
  const [selectedModel, setSelectedModel] = useState<string | undefined>();

  return (
    <SettingsLayout title={t('layout.usage')}>
      <div className="space-y-8">
        <UsageFilters
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          selectedProvider={selectedProvider}
          onProviderChange={setSelectedProvider}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
        />

        <UsageStatsCards
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
        />

        <ProviderConsumption
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          selectedProvider={selectedProvider}
        />

        <ModelDistribution
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          selectedModel={selectedModel}
        />

        <UserUsageTable
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
        />
      </div>
    </SettingsLayout>
  );
}
