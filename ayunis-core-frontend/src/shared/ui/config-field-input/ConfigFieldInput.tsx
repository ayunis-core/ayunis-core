import { Input } from '@/shared/ui/shadcn/input';
import { PasswordInput } from '@/shared/ui/shadcn/password-input';
import { Label } from '@/shared/ui/shadcn/label';
import type { MarketplaceIntegrationConfigFieldDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

interface ConfigFieldInputProps {
  field: MarketplaceIntegrationConfigFieldDto;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  /** Override placeholder for secret fields (e.g. "Leave blank to keep existing") */
  secretPlaceholder?: string;
  /** Prefix for the input id attribute (default: "config-field") */
  idPrefix?: string;
}

export function ConfigFieldInput({
  field,
  value,
  onChange,
  disabled,
  secretPlaceholder,
  idPrefix = 'config-field',
}: ConfigFieldInputProps) {
  const inputId = `${idPrefix}-${field.key}`;
  const placeholder =
    field.type === 'secret' && secretPlaceholder
      ? secretPlaceholder
      : (field.help ?? '');

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>
        {field.label}
        {field.required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {field.type === 'secret' ? (
        <PasswordInput
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
        />
      ) : (
        <Input
          id={inputId}
          type={field.type === 'url' ? 'url' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={field.help ?? ''}
        />
      )}
      {field.help && (
        <p className="text-xs text-muted-foreground">{field.help}</p>
      )}
    </div>
  );
}
