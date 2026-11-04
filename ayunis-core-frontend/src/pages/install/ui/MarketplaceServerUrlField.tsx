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
import { isValidMcpServerUrl } from '@/shared/lib/mcp-server-url';
import type { InstallIntegrationFormFields } from '@/pages/install/model/types';

export function MarketplaceServerUrlField({
  form,
  hint,
  disabled,
}: Readonly<{
  form: UseFormReturn<InstallIntegrationFormFields>;
  hint: string | null;
  disabled: boolean;
}>) {
  const { t } = useTranslation('install-integration');
  return (
    <FormField
      control={form.control}
      name="serverUrl"
      rules={{
        required: t('serverUrl.required'),
        validate: (value) =>
          isValidMcpServerUrl(value) || t('serverUrl.invalid'),
      }}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('serverUrl.label')}</FormLabel>
          <FormControl>
            <Input
              type="url"
              placeholder={t('serverUrl.placeholder')}
              {...field}
              disabled={disabled}
              data-testid="install-server-url"
            />
          </FormControl>
          <FormDescription>
            {hint ?? t('serverUrl.description')}
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
