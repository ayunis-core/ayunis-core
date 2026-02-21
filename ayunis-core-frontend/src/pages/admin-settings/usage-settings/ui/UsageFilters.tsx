import { useMemo } from 'react';
import { useProviders } from '@/features/models';
import { usePermittedModels } from '@/features/usePermittedModels';
import { UsageFiltersWidget } from '@/widgets/usage-filters/ui/UsageFiltersWidget';

interface UsageFiltersProps {
  dateRange: { startDate?: Date; endDate?: Date };
  onDateRangeChange: (range: { startDate?: Date; endDate?: Date }) => void;
  selectedProvider?: string;
  onProviderChange: (provider?: string) => void;
  selectedModel?: string;
  onModelChange: (model?: string) => void;
}

export function UsageFilters({
  dateRange,
  onDateRangeChange,
  selectedProvider,
  onProviderChange,
  selectedModel,
  onModelChange,
}: Readonly<UsageFiltersProps>) {
  const { providers } = useProviders();
  const { models } = usePermittedModels();

  const providerOptions = useMemo(() => {
    if (!providers.length) return [];
    const unique = Array.from(
      new Map(providers.map((p) => [p.provider, p])).values(),
    );
    return unique.map((p) => ({ value: p.provider, label: p.displayName }));
  }, [providers]);

  const modelOptions = useMemo(() => {
    if (!models.length) return [];
    const unique = Array.from(new Map(models.map((m) => [m.name, m])).values());
    return unique.map((m) => ({ value: m.name, label: m.displayName }));
  }, [models]);

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
