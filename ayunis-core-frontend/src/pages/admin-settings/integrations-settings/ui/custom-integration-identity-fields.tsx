import type { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ayunis/ui/components/form';
import { Input } from '@ayunis/ui/components/input';
import type { CreateCustomIntegrationFormData } from '@/pages/admin-settings/integrations-settings/model/types';

export function CustomIntegrationIdentityFields({
  form,
  disabled,
  serverUrlTestId,
}: Readonly<{
  form: UseFormReturn<CreateCustomIntegrationFormData>;
  disabled: boolean;
  serverUrlTestId?: string;
}>) {
  const { t } = useTranslation('admin-settings-integrations');

  return (
    <>
      <FormField
        control={form.control}
        name="name"
        rules={{ required: true }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('integrations.createCustomDialog.name')}</FormLabel>
            <FormControl>
              <Input
                placeholder={t(
                  'integrations.createCustomDialog.namePlaceholder',
                )}
                {...field}
                disabled={disabled}
              />
            </FormControl>
            <FormDescription>
              {t('integrations.createCustomDialog.nameDescription')}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="serverUrl"
        rules={{ required: true }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t('integrations.createCustomDialog.serverUrl')}
            </FormLabel>
            <FormControl>
              <Input
                type="url"
                placeholder={t(
                  'integrations.createCustomDialog.serverUrlPlaceholder',
                )}
                {...field}
                disabled={disabled}
                data-testid={serverUrlTestId}
              />
            </FormControl>
            <FormDescription>
              {t('integrations.createCustomDialog.serverUrlDescription')}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
