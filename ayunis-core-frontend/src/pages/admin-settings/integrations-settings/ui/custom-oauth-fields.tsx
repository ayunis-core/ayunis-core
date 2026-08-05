import { useWatch, type UseFormReturn } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';
import { useMcpOAuthClientMetadata } from '@/features/mcp-oauth';
import type { CreateCustomIntegrationFormData } from '../model/types';

export function CustomOAuthFields({
  form,
  disabled,
}: Readonly<{
  form: UseFormReturn<CreateCustomIntegrationFormData>;
  disabled: boolean;
}>) {
  const { t } = useTranslation('admin-settings-integrations');
  const { callbackUri } = useMcpOAuthClientMetadata();
  const authType = useWatch({ control: form.control, name: 'authType' });
  const registration = useWatch({
    control: form.control,
    name: 'oauthClientRegistration',
  });

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="authType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('integrations.oauth.authType')}</FormLabel>
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={disabled}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="CUSTOM">
                  {t('integrations.oauth.customHeaders')}
                </SelectItem>
                <SelectItem value="OAUTH">
                  {t('integrations.oauth.oauth')}
                </SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>
              {t('integrations.oauth.authTypeDescription')}
            </FormDescription>
          </FormItem>
        )}
      />

      {authType === 'OAUTH' && (
        <>
          <FormField
            control={form.control}
            name="oauthClientRegistration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('integrations.oauth.registration')}</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={disabled}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="automatic">
                      {t('integrations.oauth.registrationAutomatic')}
                    </SelectItem>
                    <SelectItem value="static">
                      {t('integrations.oauth.registrationStatic')}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  {t('integrations.oauth.registrationDescription')}
                </FormDescription>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="oauthScopes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('integrations.oauth.scopes')}</FormLabel>
                <FormControl>
                  <Input {...field} disabled={disabled} />
                </FormControl>
                <FormDescription>
                  {t('integrations.oauth.scopesDescription')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormItem>
            <FormLabel>{t('integrations.oauth.callbackUri')}</FormLabel>
            <FormControl>
              <Input value={callbackUri} readOnly />
            </FormControl>
            <FormDescription>
              {t('integrations.oauth.callbackUriDescription')}
            </FormDescription>
          </FormItem>

          {registration === 'static' && (
            <StaticClientFields form={form} disabled={disabled} />
          )}
        </>
      )}
    </div>
  );
}

function StaticClientFields({
  form,
  disabled,
}: Readonly<{
  form: UseFormReturn<CreateCustomIntegrationFormData>;
  disabled: boolean;
}>) {
  const { t } = useTranslation('admin-settings-integrations');
  return (
    <>
      <FormField
        control={form.control}
        name="oauthClientId"
        rules={{ required: true }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('integrations.oauth.clientId')}</FormLabel>
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
    </>
  );
}
