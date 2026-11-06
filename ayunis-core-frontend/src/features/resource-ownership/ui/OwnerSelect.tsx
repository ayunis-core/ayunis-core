import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';
import type { OwnerOption } from '@/features/resource-ownership/model/types';

export function OwnerSelect({
  id,
  options,
  value,
  onValueChange,
  disabled = false,
  testId,
}: Readonly<{
  id?: string;
  options: OwnerOption[];
  value: string;
  onValueChange: (key: string) => void;
  disabled?: boolean;
  testId?: string;
}>) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger id={id} className="w-full" data-testid={testId}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem
            key={option.key}
            value={option.key}
            data-testid={testId ? `${testId}-option-${option.key}` : undefined}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
