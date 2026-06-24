import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { Switch } from '@/shared/ui/shadcn/switch';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemTitle,
} from '@/shared/ui/shadcn/item';
import type { PiiCategory } from '@/shared/api';
import type { CategoryRowState } from '../model/types';
import { MAX_PATTERN_LENGTH } from '../lib/validate-regex';
import type { RegexValidationError } from '../lib/validate-regex';

interface PiiCategoryRowProps {
  category: PiiCategory;
  row: CategoryRowState;
  error?: RegexValidationError;
  disabled: boolean;
  onChange: (row: CategoryRowState) => void;
}

export function PiiCategoryRow({
  category,
  row,
  error,
  disabled,
  onChange,
}: Readonly<PiiCategoryRowProps>) {
  const { t } = useTranslation('admin-settings-anonymization');

  const label = t(`piiWhitelist.categories.${category}.label`);
  const placeholder = t(`piiWhitelist.categories.${category}.placeholder`);
  const example = t(`piiWhitelist.categories.${category}.example`);
  const errorMessage =
    error === 'too_long'
      ? t('piiWhitelist.patternTooLong', { max: MAX_PATTERN_LENGTH })
      : t('piiWhitelist.invalidPattern');

  return (
    <Item variant="outline">
      <ItemContent>
        <ItemTitle>{label}</ItemTitle>
        <ItemDescription>
          {t(`piiWhitelist.categories.${category}.description`)}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Switch
          checked={row.enabled}
          disabled={disabled}
          aria-label={label}
          onCheckedChange={(enabled) => onChange({ ...row, enabled })}
        />
      </ItemActions>

      {row.enabled && (
        <ItemFooter>
          <div className="w-full space-y-2">
            <Label
              htmlFor={`pii-pattern-${category}`}
              className="text-sm font-normal"
            >
              {t('piiWhitelist.patternLabel')}
            </Label>
            <Input
              id={`pii-pattern-${category}`}
              value={row.pattern}
              disabled={disabled}
              placeholder={placeholder}
              className="text-sm"
              onChange={(e) => onChange({ ...row, pattern: e.target.value })}
            />
            {error ? (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            ) : (
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>
                  {t('piiWhitelist.exampleLabel')}{' '}
                  <span className="text-foreground">{placeholder}</span>
                  {' – '}
                  {example}
                </p>
                <p>{t('piiWhitelist.patternHint')}</p>
              </div>
            )}
          </div>
        </ItemFooter>
      )}
    </Item>
  );
}
