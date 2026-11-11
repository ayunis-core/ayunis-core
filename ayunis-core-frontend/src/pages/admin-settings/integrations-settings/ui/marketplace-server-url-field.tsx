import { useFormContext } from 'react-hook-form';
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
import type { UpdateIntegrationFormData } from '@/pages/admin-settings/integrations-settings/model/types';
import { isValidMcpServerUrl } from '@/shared/lib/mcp-server-url';

export function MarketplaceServerUrlField({
  hint,
  disabled,
}: Readonly<{ hint: string | null | undefined; disabled: boolean }>) {
  const { t } = useTranslation('admin-settings-integrations');
  const form = useFormContext<UpdateIntegrationFormData>();
  return (
    <FormField
      control={form.control}
      name="serverUrl"
      rules={{
        required: t('integrations.serverUrlChange.required'),
        validate: (value) =>
          isValidMcpServerUrl(value ?? '') ||
          t('integrations.serverUrlChange.invalid'),
      }}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {t('integrations.createCustomDialog.serverUrl')}
          </FormLabel>
          <FormControl>
            <Input
              type="url"
              {...field}
              value={field.value ?? ''}
              disabled={disabled}
              data-testid="integration-edit-server-url"
            />
          </FormControl>
          {hint && <FormDescription>{hint}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
