import type { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  FormControl,
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
                  {t(`models.tier.${tier}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
