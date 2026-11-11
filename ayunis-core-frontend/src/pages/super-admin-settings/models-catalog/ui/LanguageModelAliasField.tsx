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

interface LanguageModelAliasFieldProps {
  form: UseFormReturn<LanguageModelFormData>;
  disabled: boolean;
}

export function LanguageModelAliasField({
  form,
  disabled,
}: Readonly<LanguageModelAliasFieldProps>) {
  const { t } = useTranslation('super-admin-settings-org');

  return (
    <FormField
      control={form.control}
      name="alias"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('models.catalog.dialog.alias')}</FormLabel>
          <FormControl>
            <Input
              {...field}
              placeholder={t('models.catalog.dialog.aliasPlaceholder')}
              disabled={disabled}
              required
              data-testid="model-catalog-alias"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
