import { ListFilter as ListFilterIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';
import type {
  FilterOption,
  ListFilter,
} from '@/pages/skill-sharing-prototype/lib/list-sections';

export function ListFilterSelect({
  value,
  options,
  onChange,
}: Readonly<{
  value: ListFilter;
  options: FilterOption[];
  onChange: (value: ListFilter) => void;
}>) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next as ListFilter)}
    >
      <SelectTrigger size="sm" aria-label="Liste filtern">
        <span className="flex min-w-0 items-center gap-2">
          <ListFilterIcon />
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
