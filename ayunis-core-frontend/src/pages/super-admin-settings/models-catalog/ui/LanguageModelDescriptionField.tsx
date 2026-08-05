import type { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/shadcn/form';
import { Textarea } from '@/shared/ui/shadcn/textarea';
import type { LanguageModelFormData } from '../model/types';

interface LanguageModelDescriptionFieldProps {
  form: UseFormReturn<LanguageModelFormData>;
  disabled: boolean;
}

export function LanguageModelDescriptionField({
  form,
  disabled,
}: Readonly<LanguageModelDescriptionFieldProps>) {
  const { t } = useTranslation('admin-settings-models');
  return (
    <FormField
      control={form.control}
      name="description"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('models.description.label')}</FormLabel>
          <FormControl>
            <Textarea
              {...field}
              value={field.value ?? ''}
              placeholder={t('models.description.placeholder')}
              maxLength={500}
              rows={3}
              disabled={disabled}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
