import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/shadcn/select';
import { MonthPicker } from '@/widgets/month-picker';

interface FilterOption {
  value: string;
  label: string;
}

interface UsageOverviewFiltersProps {
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
  selectedProvider?: string;
  onProviderChange: (provider?: string) => void;
  selectedModel?: string;
  onModelChange: (model?: string) => void;
  providerOptions: FilterOption[];
  modelOptions: FilterOption[];
}

export function UsageOverviewFilters({
  year,
  month,
  onMonthChange,
  selectedProvider,
  onProviderChange,
  selectedModel,
  onModelChange,
  providerOptions,
  modelOptions,
}: Readonly<UsageOverviewFiltersProps>) {
  const { t } = useTranslation('admin-settings-usage');

  return (
    <div className="flex flex-wrap items-center gap-3">
      <MonthPicker year={year} month={month} onMonthChange={onMonthChange} />

      <Select
        value={selectedProvider ?? 'all'}
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
        value={selectedModel ?? 'all'}
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
