// Utils
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

// Ui
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/shadcn/select';

// Api
import { useProviders } from '@/features/models';
import { usePermittedModels } from '@/features/usePermittedModels';

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
}: UsageFiltersProps) {
  const { t } = useTranslation('admin-settings-usage');
  const { providers } = useProviders();
  const { models } = usePermittedModels();

  const DAY_IN_MS = 24 * 60 * 60 * 1000;
  const DATE_RANGES = [
    { value: 'last_7_days', label: t('filters.last7Days'), days: 7 },
    { value: 'last_30_days', label: t('filters.last30Days'), days: 30 },
    { value: 'last_90_days', label: t('filters.last90Days'), days: 90 },
    { value: 'all_time', label: t('filters.allTime') },
  ];

  const providerOptions = useMemo(() => {
    if (!providers?.length) {
      return [];
    }

    const unique = Array.from(
      new Map(providers.map((p) => [p.provider, p])).values(),
    );
    return unique.map((p) => ({ value: p.provider, label: p.displayName }));
  }, [providers]);

  const modelOptions = useMemo(() => {
    if (!models?.length) {
      return [];
    }

    const unique = Array.from(new Map(models.map((m) => [m.name, m])).values());
    return unique.map((m) => ({ value: m.name, label: m.displayName }));
  }, [models]);

  const handleDateRangeSelect = (value: string) => {
    if (value === 'all_time') {
      onDateRangeChange({});
      return;
    }

    const selectedRange = DATE_RANGES.find((range) => range.value === value);
    if (!selectedRange?.days) {
      onDateRangeChange({});
      return;
    }

    const now = new Date();
    const startDate = new Date(now.getTime() - selectedRange.days * DAY_IN_MS);

    onDateRangeChange({ startDate, endDate: now });
  };

  const getCurrentDateRangeValue = () => {
    const { startDate, endDate } = dateRange;
    if (!startDate || !endDate) return 'all_time';

    const daysDiff = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / DAY_IN_MS,
    );

    if (daysDiff <= 7) return 'last_7_days';
    if (daysDiff <= 30) return 'last_30_days';
    if (daysDiff <= 90) return 'last_90_days';

    return 'custom';
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={getCurrentDateRangeValue()}
        onValueChange={handleDateRangeSelect}
      >
        <SelectTrigger>
          <SelectValue placeholder={t('filters.selectDateRange')} />
        </SelectTrigger>
        <SelectContent>
          {DATE_RANGES.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={selectedProvider || 'all'}
        onValueChange={(value) =>
          onProviderChange(value === 'all' ? undefined : value)
        }
      >
        <SelectTrigger>
          <SelectValue placeholder={t('filters.allProviders')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('filters.allProviders')}</SelectItem>
          {providerOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={selectedModel || 'all'}
        onValueChange={(value) =>
          onModelChange(value === 'all' ? undefined : value)
        }
      >
        <SelectTrigger>
          <SelectValue placeholder={t('filters.allModels')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('filters.allModels')}</SelectItem>
          {modelOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
