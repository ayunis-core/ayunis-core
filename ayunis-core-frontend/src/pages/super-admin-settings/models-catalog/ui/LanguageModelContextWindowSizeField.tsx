import type { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ayunis/ui/components/form';
import { Input } from '@ayunis/ui/components/input';
import type { LanguageModelFormData } from '@/pages/super-admin-settings/models-catalog/model/types';

interface LanguageModelContextWindowSizeFieldProps {
  form: UseFormReturn<LanguageModelFormData>;
  disabled: boolean;
}

export function LanguageModelContextWindowSizeField({
  form,
  disabled,
}: Readonly<LanguageModelContextWindowSizeFieldProps>) {
  const { t } = useTranslation('super-admin-settings-org');

  return (
    <FormField
      control={form.control}
      name="contextWindowSize"
      rules={{
        validate: {
          isInteger: (value) =>
            value === undefined ||
            Number.isInteger(value) ||
            t('models.catalog.validation.contextWindowSize.isInt'),
          isPositive: (value) =>
            value === undefined ||
            value >= 1 ||
            t('models.catalog.validation.contextWindowSize.min'),
        },
      }}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('models.catalog.dialog.contextWindowSize')}</FormLabel>
          <FormControl>
            <Input
              {...field}
              type="number"
              min={1}
              step={1}
              value={field.value ?? ''}
              onChange={(event) =>
                field.onChange(
                  event.currentTarget.value === ''
                    ? undefined
                    : event.currentTarget.valueAsNumber,
                )
              }
              placeholder={t(
                'models.catalog.dialog.contextWindowSizePlaceholder',
              )}
              disabled={disabled}
              data-testid="model-catalog-context-window-size"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
