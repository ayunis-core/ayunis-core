import { useMemo } from 'react';
import { UsageFiltersWidget } from '@/widgets/usage-filters/ui/UsageFiltersWidget';
import { useSuperAdminModelsControllerGetPermittedModels } from '@/shared/api';

interface SuperAdminUsageFiltersProps {
  orgId: string;
  dateRange: { startDate?: Date; endDate?: Date };
  onDateRangeChange: (range: { startDate?: Date; endDate?: Date }) => void;
  selectedProvider?: string;
  onProviderChange: (provider?: string) => void;
  selectedModel?: string;
  onModelChange: (model?: string) => void;
}

export function SuperAdminUsageFilters({
  orgId,
  dateRange,
  onDateRangeChange,
  selectedProvider,
  onProviderChange,
  selectedModel,
  onModelChange,
}: Readonly<SuperAdminUsageFiltersProps>) {
  const { data: permittedModels } =
    useSuperAdminModelsControllerGetPermittedModels(orgId);

  const providerOptions = useMemo(() => {
    if (!permittedModels?.length) return [];
    const providerMap = new Map<string, string>();
    permittedModels.forEach((m) => {
      if (!providerMap.has(m.provider)) {
        providerMap.set(m.provider, m.providerDisplayName);
      }
    });
    return Array.from(providerMap.entries()).map(([value, label]) => ({
      value,
      label,
    }));
  }, [permittedModels]);

  const modelOptions = useMemo(() => {
    if (!permittedModels?.length) return [];
    const modelMap = new Map<string, string>();
    permittedModels.forEach((m) => {
      if (!modelMap.has(m.id)) {
        modelMap.set(m.id, m.displayName);
      }
    });
    return Array.from(modelMap.entries()).map(([value, label]) => ({
      value,
      label,
    }));
  }, [permittedModels]);

  return (
    <UsageFiltersWidget
      dateRange={dateRange}
      onDateRangeChange={onDateRangeChange}
      selectedProvider={selectedProvider}
      onProviderChange={onProviderChange}
      selectedModel={selectedModel}
      onModelChange={onModelChange}
      providerOptions={providerOptions}
      modelOptions={modelOptions}
    />
  );
}
