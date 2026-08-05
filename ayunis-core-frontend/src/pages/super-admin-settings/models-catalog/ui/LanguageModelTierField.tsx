import type { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/shadcn/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/shadcn/select';
import { CreateLanguageModelRequestDtoTier } from '@/shared/api';
import type { LanguageModelFormData } from '../model/types';

// Radix Select disallows empty string values; converted to undefined before reaching form state.
const TIER_UNSET_VALUE = '__unset__';

interface LanguageModelTierFieldProps {
  form: UseFormReturn<LanguageModelFormData>;
  disabled: boolean;
}

export function LanguageModelTierField({
  form,
  disabled,
}: Readonly<LanguageModelTierFieldProps>) {
  const { t } = useTranslation('admin-settings-models');
  const { t: tCommon } = useTranslation('common');
  return (
    <FormField
      control={form.control}
      name="tier"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('models.tier.label')}</FormLabel>
          <Select
            onValueChange={(value) =>
              field.onChange(
                value === TIER_UNSET_VALUE
                  ? undefined
                  : (value as CreateLanguageModelRequestDtoTier),
              )
            }
            value={field.value ?? TIER_UNSET_VALUE}
            disabled={disabled}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={t('models.tier.unset')} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value={TIER_UNSET_VALUE}>
                {t('models.tier.unset')}
              </SelectItem>
              {Object.values(CreateLanguageModelRequestDtoTier).map((tier) => (
                <SelectItem key={tier} value={tier}>
                  {tCommon(`models.category.${tier}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {field.value && (
            <FormDescription>
              {t('models.tier.userFacingHint', {
                category: tCommon(`models.category.${field.value}`),
                usage: tCommon(`models.tierUsage.${field.value}`),
              })}
            </FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
