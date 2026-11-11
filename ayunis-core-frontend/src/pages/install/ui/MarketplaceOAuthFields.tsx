import type { UseFormReturn } from 'react-hook-form';
import type { TFunction } from 'i18next';
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
import type { McpOAuthConfig } from '@/shared/lib/mcp-oauth';
import { useMcpOAuthClientMetadata } from '@/features/mcp-oauth';
import type { InstallIntegrationFormFields } from '@/pages/install/model/types';
import { CopyButton } from '@/shared/ui/copy-button';

export function MarketplaceOAuthFields({
  oauth,
  form,
  disabled,
  t,
}: Readonly<{
  oauth: McpOAuthConfig;
  form: UseFormReturn<InstallIntegrationFormFields>;
  disabled: boolean;
  t: TFunction;
}>) {
  const { callbackUri } = useMcpOAuthClientMetadata();
  return (
    <div className="space-y-4 rounded-md border p-4">
      <div>
        <p className="font-medium">{t('oauth.title')}</p>
        <p className="text-sm text-muted-foreground">
          {t(`oauth.registration.${oauth.clientRegistration}`)}
        </p>
      </div>
      {oauth.scopes && oauth.scopes.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {t('oauth.scopes', { scopes: oauth.scopes.join(' ') })}
        </p>
      )}
      <div>
        <p className="text-sm font-medium">{t('oauth.callbackUri')}</p>
        <div className="mt-1 flex items-center gap-2">
          <code className="rounded bg-muted px-1.5 py-0.5 break-all text-xs">
            {callbackUri}
          </code>
          <CopyButton
            value={callbackUri}
            label={t('oauth.callbackUri')}
            testId="install-callback-uri-copy"
          />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('oauth.callbackUriDescription')}
        </p>
      </div>
      {oauth.clientRegistration === 'static' && (
        <StaticOAuthClientFields form={form} disabled={disabled} t={t} />
      )}
    </div>
  );
}

function StaticOAuthClientFields({
  form,
  disabled,
  t,
}: Readonly<{
  form: UseFormReturn<InstallIntegrationFormFields>;
  disabled: boolean;
  t: TFunction;
}>) {
  return (
    <>
      <FormField
        control={form.control}
        name="oauthClientId"
        rules={{ required: true }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('oauth.clientId')}</FormLabel>
            <FormControl>
              <Input {...field} disabled={disabled} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="oauthClientSecret"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('oauth.clientSecret')}</FormLabel>
            <FormControl>
              <PasswordInput {...field} disabled={disabled} />
            </FormControl>
            <FormDescription>
              {t('oauth.clientSecretDescription')}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
