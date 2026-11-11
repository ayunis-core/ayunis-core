import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';
import { groupOwnerOptions } from '@/features/resource-ownership/lib/owner-option-groups';
import type { OwnerOption } from '@/features/resource-ownership/model/types';

export function OwnerSelect({
  id,
  options,
  value,
  onValueChange,
  disabled = false,
  grouped = false,
  testId,
}: Readonly<{
  id?: string;
  options: OwnerOption[];
  value: string;
  onValueChange: (key: string) => void;
  disabled?: boolean;
  /** Heads personal and organisation-and-team options separately. */
  grouped?: boolean;
  testId?: string;
}>) {
  const { t } = useTranslation('ownership');

  const renderOption = (option: OwnerOption) => (
    <SelectItem
      key={option.key}
      value={option.key}
      data-testid={testId ? `${testId}-option-${option.key}` : undefined}
    >
      {option.label}
    </SelectItem>
  );

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger id={id} className="w-full" data-testid={testId}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {grouped
          ? groupOwnerOptions(options).map((group, index) => (
              <Fragment key={group.key}>
                {index > 0 && <SelectSeparator />}
                <SelectGroup
                  data-testid={
                    testId ? `${testId}-group-${group.key}` : undefined
                  }
                >
                  <SelectLabel>{t(`group.${group.key}`)}</SelectLabel>
                  {group.options.map(renderOption)}
                </SelectGroup>
              </Fragment>
            ))
          : options.map(renderOption)}
      </SelectContent>
    </Select>
  );
}
