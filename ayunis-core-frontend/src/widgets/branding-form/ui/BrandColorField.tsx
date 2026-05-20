import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pipette } from 'lucide-react';
import { Input } from '@/shared/ui/shadcn/input';
import { Button } from '@/shared/ui/shadcn/button';
import { Label } from '@/shared/ui/shadcn/label';
import { Skeleton } from '@/shared/ui/shadcn/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/shadcn/toggle-group';
import { cn } from '@/shared/lib/shadcn/utils';
import { HEX_REGEX, isValidHex, meetsContrast } from '../lib/color-utils';

// `<input type="color">` requires a literal hex — CSS vars and OKLCH are
// silently rejected by the browser. Update if `--primary` in core.css changes.
const PICKER_PLACEHOLDER_COLOR = '#27272a';
const HEX_INPUT_PLACEHOLDER = '#3b82f6';

const COLOR_PRESETS: ReadonlyArray<{ hex: string; nameKey: string }> = [
  { hex: '#2563eb', nameKey: 'organization.colorPresetBlue' },
  { hex: '#0f766e', nameKey: 'organization.colorPresetTeal' },
  { hex: '#16a34a', nameKey: 'organization.colorPresetGreen' },
  { hex: '#d97706', nameKey: 'organization.colorPresetAmber' },
  { hex: '#7c3aed', nameKey: 'organization.colorPresetViolet' },
];

interface BrandColorFieldProps {
  value: string | null;
  disabled?: boolean;
  // null = extraction in flight (show skeleton instead of presets to avoid
  // flicker). [] = extraction done, no usable colors -> fall back to presets.
  suggestedColors?: string[] | null;
  onChange: (hex: string | null) => void;
  onValidityChange?: (valid: boolean) => void;
}

export function BrandColorField({
  value,
  disabled,
  suggestedColors,
  onChange,
  onValidityChange,
}: Readonly<BrandColorFieldProps>) {
  const { t } = useTranslation('admin-settings-organization');

  const hasCustomColor = !!value && isValidHex(value);
  const pickerValue = hasCustomColor ? value : PICKER_PLACEHOLDER_COLOR;

  const hexValid = !value || isValidHex(value);
  const contrastOk = !value || meetsContrast(value);

  const isValid = hexValid && contrastOk;
  useEffect(() => {
    onValidityChange?.(isValid);
  }, [isValid, onValidityChange]);

  function handleHexChange(raw: string) {
    const trimmed = raw.trim();
    if (trimmed === '') {
      onChange(null);
      return;
    }
    const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    onChange(withHash.toLowerCase());
  }

  function handleColorPicker(raw: string) {
    onChange(raw.toLowerCase());
  }

  const isExtracting = suggestedColors === null;
  const hasLogoSuggestions = !!suggestedColors && suggestedColors.length > 0;
  const chips = hasLogoSuggestions
    ? suggestedColors.map((hex) => ({ hex, label: hex }))
    : COLOR_PRESETS.map((p) => ({ hex: p.hex, label: t(p.nameKey) }));
  const chipsHeading =
    isExtracting || hasLogoSuggestions
      ? t('organization.colorSuggestionsLabel')
      : t('organization.colorPresetsLabel');

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-normal text-muted-foreground">
          {chipsHeading}
        </p>
        {isExtracting ? (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-full" />
            ))}
          </div>
        ) : (
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            spacing={2}
            disabled={disabled}
            value={(value ?? '').toLowerCase()}
            onValueChange={(next) => {
              if (next) onChange(next);
            }}
            className="w-full flex-wrap"
          >
            {chips.map((chip) => (
              <ToggleGroupItem
                key={chip.hex}
                value={chip.hex}
                aria-label={chip.label}
                className="gap-2 rounded-full px-3"
              >
                <span
                  aria-hidden="true"
                  className="size-3.5 rounded-full"
                  style={{ backgroundColor: chip.hex }}
                />
                {chip.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-normal text-muted-foreground">
          {t('organization.colorCustomLabel')}
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="group relative flex flex-col gap-2">
            <Label htmlFor="brand-color-picker" className="sr-only">
              {t('organization.colorLabel')}
            </Label>
            <input
              id="brand-color-picker"
              type="color"
              value={pickerValue}
              disabled={disabled}
              onChange={(e) => handleColorPicker(e.target.value)}
              className={cn(
                'h-9 w-9 cursor-pointer overflow-hidden rounded-md border border-input bg-background p-0',
                'disabled:cursor-not-allowed disabled:opacity-60',
                '[&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-none [&::-webkit-color-swatch]:border-0 [&::-moz-color-swatch]:rounded-none [&::-moz-color-swatch]:border-0',
              )}
            />
            <span
              aria-hidden="true"
              className={cn(
                'pointer-events-none absolute inset-px flex items-center justify-center rounded-[7px] bg-black/30 opacity-100 transition-opacity',
                'group-hover:bg-black/50',
                disabled && 'opacity-0',
              )}
            >
              <Pipette className="size-4 text-white drop-shadow" />
            </span>
          </div>

          <div className="flex flex-1 flex-col gap-2 min-w-[180px]">
            <Label htmlFor="brand-color-hex" className="sr-only">
              {t('organization.colorLabel')}
            </Label>
            <Input
              id="brand-color-hex"
              type="text"
              value={value ?? ''}
              placeholder={HEX_INPUT_PLACEHOLDER}
              disabled={disabled}
              pattern={HEX_REGEX.source}
              onChange={(e) => handleHexChange(e.target.value)}
            />
          </div>

          {value && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => onChange(null)}
              disabled={disabled}
            >
              {t('organization.colorReset')}
            </Button>
          )}
        </div>
      </div>

      {value && !hexValid && (
        <p className="text-destructive text-sm">
          {t('organization.colorInvalidHex')}
        </p>
      )}

      {value && hexValid && !contrastOk && (
        <p className="text-destructive text-sm">
          {t('organization.colorContrastFail')}
        </p>
      )}
    </div>
  );
}
