import { useMemo } from 'react';
import { useSuperAdminModelsControllerGetAllCatalogModels } from '@/shared/api';
import { UsageFiltersWidget } from '@/widgets/usage-filters/ui/UsageFiltersWidget';

interface GlobalUsageFiltersProps {
  dateRange: { startDate?: Date; endDate?: Date };
  onDateRangeChange: (range: { startDate?: Date; endDate?: Date }) => void;
  selectedProvider?: string;
  onProviderChange: (provider?: string) => void;
  selectedModel?: string;
  onModelChange: (model?: string) => void;
}

export function GlobalUsageFilters({
  dateRange,
  onDateRangeChange,
  selectedProvider,
  onProviderChange,
  selectedModel,
  onModelChange,
}: Readonly<GlobalUsageFiltersProps>) {
  const { data: catalogModels } =
    useSuperAdminModelsControllerGetAllCatalogModels();

  const providerOptions = useMemo(() => {
    if (!catalogModels?.length) return [];
    const providerSet = new Set<string>();
    catalogModels.forEach((m) => providerSet.add(m.provider));
    return Array.from(providerSet).map((p) => ({
      value: p,
      label: p.charAt(0).toUpperCase() + p.slice(1),
    }));
  }, [catalogModels]);

  const modelOptions = useMemo(() => {
    if (!catalogModels?.length) return [];
    const modelMap = new Map<string, string>();
    catalogModels.forEach((m) => {
      if (!modelMap.has(m.id)) {
        modelMap.set(m.id, m.displayName);
      }
    });
    return Array.from(modelMap.entries()).map(([value, label]) => ({
      value,
      label,
    }));
  }, [catalogModels]);

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
