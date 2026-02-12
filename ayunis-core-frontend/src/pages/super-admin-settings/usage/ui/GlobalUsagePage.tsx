import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import SuperAdminSettingsLayout from '../../super-admin-settings-layout';
import { GlobalUsageFilters } from './GlobalUsageFilters';
import { GlobalProviderConsumption } from './GlobalProviderConsumption';
import { GlobalModelDistribution } from './GlobalModelDistribution';

export default function GlobalUsagePage() {
  const { t } = useTranslation('admin-settings-usage');
  const [dateRange, setDateRange] = useState<{
    startDate?: Date;
    endDate?: Date;
  }>({});
  const [selectedProvider, setSelectedProvider] = useState<
    string | undefined
  >();
  const [selectedModel, setSelectedModel] = useState<string | undefined>();

  return (
    <SuperAdminSettingsLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('title')}</h2>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>

        <GlobalUsageFilters
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          selectedProvider={selectedProvider}
          onProviderChange={setSelectedProvider}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <GlobalProviderConsumption
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            selectedProvider={selectedProvider}
          />
          <GlobalModelDistribution
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            selectedModel={selectedModel}
          />
        </div>
      </div>
    </SuperAdminSettingsLayout>
  );
}
