import { Label } from '@ayunis/ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';
import { useTranslation } from 'react-i18next';
import { ownerOptionValue } from '@/features/resource-ownership/lib/owner-copy';
import type {
  OwnedResourceKind,
  OwnerOption,
} from '@/features/resource-ownership/model/types';
import { useOwnershipCopy } from '@/features/resource-ownership/model/useOwnershipCopy';

export function OwnerField({
  kind,
  options,
  value,
  orgEditorsIncludeNonAdmins,
  onChange,
}: Readonly<{
  kind: OwnedResourceKind;
  options: OwnerOption[];
  value: OwnerOption;
  orgEditorsIncludeNonAdmins: boolean;
  onChange: (option: OwnerOption) => void;
}>) {
  const { t } = useTranslation('resource-ownership');
  const copy = useOwnershipCopy(kind);
  const fieldId = `${kind}-owner`;

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId}>{t('field.label')}</Label>
      <Select
        value={ownerOptionValue(value)}
        onValueChange={(next) => {
          const option = options.find(
            (candidate) => ownerOptionValue(candidate) === next,
          );
          if (option) onChange(option);
        }}
      >
        <SelectTrigger
          id={fieldId}
          className="w-full"
          data-testid="owner-field"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={ownerOptionValue(option)}
              value={ownerOptionValue(option)}
              data-testid={`owner-option-${ownerOptionValue(option)}`}
            >
              {copy.optionLabel(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {copy.optionHint(value, orgEditorsIncludeNonAdmins)}
      </p>
    </div>
  );
}
