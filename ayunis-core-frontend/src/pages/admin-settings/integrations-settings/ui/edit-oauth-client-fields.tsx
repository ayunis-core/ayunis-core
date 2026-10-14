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
import { PasswordInput } from '@ayunis/ui/components/password-input';
import { useMcpOAuthClientMetadata } from '@/features/mcp-oauth';
import { CopyButton } from '@/shared/ui/copy-button';

interface OAuthClientFormValues {
  oauthClientId?: string;
  oauthClientSecret?: string;
}

export function EditOAuthClientFields({
  disabled,
}: Readonly<{
  disabled: boolean;
}>) {
  const { t } = useTranslation('admin-settings-integrations');
  const { callbackUri } = useMcpOAuthClientMetadata();
  const form = useFormContext<OAuthClientFormValues>();
  return (
    <div className="space-y-4">
      <FormItem>
        <FormLabel>{t('integrations.oauth.callbackUri')}</FormLabel>
        <div className="flex items-center gap-2">
          <FormControl>
            <Input value={callbackUri} readOnly />
          </FormControl>
          <CopyButton
            value={callbackUri}
            label={t('integrations.oauth.callbackUri')}
            testId="integration-callback-uri-copy"
          />
        </div>
        <FormDescription>
          {t('integrations.oauth.callbackUriDescription')}
        </FormDescription>
      </FormItem>
      <FormField
        control={form.control}
        name="oauthClientId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('integrations.oauth.clientId')}</FormLabel>
            <FormControl>
              <Input {...field} disabled={disabled} />
            </FormControl>
            <FormDescription>
              {t('integrations.oauth.replaceClientDescription')}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="oauthClientSecret"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('integrations.oauth.clientSecret')}</FormLabel>
            <FormControl>
              <PasswordInput {...field} disabled={disabled} />
            </FormControl>
            <FormDescription>
              {t('integrations.oauth.clientSecretDescription')}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
