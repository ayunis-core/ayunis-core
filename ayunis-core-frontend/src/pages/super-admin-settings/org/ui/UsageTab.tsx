import { useState } from 'react';
import { SuperAdminUsageFilters } from './SuperAdminUsageFilters';
import { SuperAdminUsageStatsCards } from './SuperAdminUsageStatsCards';
import { SuperAdminProviderConsumption } from './SuperAdminProviderConsumption';
import { SuperAdminModelDistribution } from './SuperAdminModelDistribution';
import { SuperAdminUserUsageTable } from './SuperAdminUserUsageTable';

interface UsageTabProps {
  orgId: string;
}

export default function UsageTab({ orgId }: Readonly<UsageTabProps>) {
  const [dateRange, setDateRange] = useState<{
    startDate?: Date;
    endDate?: Date;
  }>({});
  const [selectedProvider, setSelectedProvider] = useState<
    string | undefined
  >();
  const [selectedModel, setSelectedModel] = useState<string | undefined>();

  return (
    <div className="space-y-8">
      <SuperAdminUsageFilters
        orgId={orgId}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        selectedProvider={selectedProvider}
        onProviderChange={setSelectedProvider}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
      />

      <SuperAdminUsageStatsCards
        orgId={orgId}
        startDate={dateRange.startDate}
        endDate={dateRange.endDate}
      />

      <SuperAdminProviderConsumption
        orgId={orgId}
        startDate={dateRange.startDate}
        endDate={dateRange.endDate}
        selectedProvider={selectedProvider}
      />

      <SuperAdminModelDistribution
        orgId={orgId}
        startDate={dateRange.startDate}
        endDate={dateRange.endDate}
        selectedModel={selectedModel}
      />

      <SuperAdminUserUsageTable
        orgId={orgId}
        startDate={dateRange.startDate}
        endDate={dateRange.endDate}
      />
    </div>
  );
}
