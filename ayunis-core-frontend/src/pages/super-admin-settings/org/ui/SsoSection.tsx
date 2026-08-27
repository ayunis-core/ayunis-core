import { useConfigureSuperAdminSso } from '@/pages/super-admin-settings/org/api/useConfigureSuperAdminSso';
import { useSetSuperAdminSsoEnabled } from '@/pages/super-admin-settings/org/api/useSetSuperAdminSsoEnabled';
import { useSetSuperAdminSsoJit } from '@/pages/super-admin-settings/org/api/useSetSuperAdminSsoJit';
import { useSuperAdminSsoConnection } from '@/pages/super-admin-settings/org/api/useSuperAdminSsoConnection';
import type { SsoConnectionFormFields } from '@/pages/super-admin-settings/org/model/types';
import { Alert, AlertDescription } from '@ayunis/ui/components/alert';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { Checkbox } from '@ayunis/ui/components/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ayunis/ui/components/form';
import { Input } from '@ayunis/ui/components/input';
import { Label } from '@ayunis/ui/components/label';
import { Skeleton } from '@ayunis/ui/components/skeleton';
import { Switch } from '@ayunis/ui/components/switch';
import { InfoIcon } from 'lucide-react';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import EnableSsoDialog from '@/pages/super-admin-settings/org/ui/EnableSsoDialog';

interface SsoSectionProps {
  orgId: string;
}

function connectionStatusKey(
  connection: ReturnType<typeof useSuperAdminSsoConnection>['connection'],
) {
  if (!connection) return 'sso.status.notConfigured';
  return connection.enabled ? 'sso.status.enabled' : 'sso.status.disabled';
}

export default function SsoSection({ orgId }: Readonly<SsoSectionProps>) {
  const { t } = useTranslation('super-admin-settings-org');
  const { connection, isLoading, isError } = useSuperAdminSsoConnection(orgId);
  const form = useForm<SsoConnectionFormFields>({
    defaultValues: {
      emailDomain: '',
      zitadelOrgId: '',
      zitadelIdpId: '',
      domainVerified: false,
    },
  });
  const configure = useConfigureSuperAdminSso(orgId, form);
  const setEnabled = useSetSuperAdminSsoEnabled(orgId);
  const setJit = useSetSuperAdminSsoJit(orgId);
  const domainVerified = useWatch({
    control: form.control,
    name: 'domainVerified',
  });

  // Keyed on the saved values rather than the connection object, so a JIT
  // refetch does not reset the form under an operator who is still typing.
  // `savedEnabled` is included because enabling locks the fields: without it a
  // locked form could display unsaved edits instead of the activated mapping.
  const savedEmailDomain = connection?.emailDomain ?? '';
  const savedZitadelOrgId = connection?.zitadelOrgId ?? '';
  const savedZitadelIdpId = connection?.zitadelIdpId ?? '';
  const savedEnabled = connection?.enabled ?? false;

  useEffect(() => {
    form.reset({
      emailDomain: savedEmailDomain,
      zitadelOrgId: savedZitadelOrgId,
      zitadelIdpId: savedZitadelIdpId,
      domainVerified: false,
    });
  }, [
    savedEmailDomain,
    savedZitadelOrgId,
    savedZitadelIdpId,
    savedEnabled,
    form,
  ]);

  if (isLoading) return <Skeleton className="h-80 w-full" />;
  if (isError) {
    return <p className="text-destructive text-sm">{t('sso.loadError')}</p>;
  }

  const busy = configure.isPending || setEnabled.isPending || setJit.isPending;
  const mappingLocked = connection?.enabled === true;

  function submit(values: SsoConnectionFormFields) {
    configure.configure({
      emailDomain: values.emailDomain.trim(),
      zitadelOrgId: values.zitadelOrgId.trim(),
      zitadelIdpId: values.zitadelIdpId.trim(),
      domainVerified: values.domainVerified,
      updateMapping: !mappingLocked,
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>{t('sso.title')}</CardTitle>
              <CardDescription>{t('sso.description')}</CardDescription>
            </div>
            <Badge variant={connection?.enabled ? 'default' : 'secondary'}>
              {t(connectionStatusKey(connection))}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {mappingLocked && (
            <Alert className="mb-4">
              <InfoIcon className="h-4 w-4" />
              <AlertDescription>{t('sso.mappingLocked')}</AlertDescription>
            </Alert>
          )}
          <Form {...form}>
            <form
              className="space-y-4"
              onSubmit={(event) => void form.handleSubmit(submit)(event)}
            >
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="emailDomain"
                  rules={{ required: t('sso.validation.emailDomain.required') }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('sso.emailDomain')}</FormLabel>
                      <FormControl>
                        <Input
                          data-testid="sso-email-domain"
                          placeholder="stadt.example"
                          disabled={mappingLocked || busy}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="zitadelOrgId"
                  rules={{
                    required: t('sso.validation.zitadelOrgId.required'),
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('sso.zitadelOrgId')}</FormLabel>
                      <FormControl>
                        <Input
                          data-testid="sso-zitadel-org-id"
                          disabled={mappingLocked || busy}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="zitadelIdpId"
                  rules={{
                    required: t('sso.validation.zitadelIdpId.required'),
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('sso.idp.zitadelIdpId')}</FormLabel>
                      <FormControl>
                        <Input
                          data-testid="sso-zitadel-idp-id"
                          disabled={busy}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="domainVerified"
                rules={{
                  required: mappingLocked
                    ? false
                    : t('sso.validation.domainVerified.required'),
                }}
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-start gap-2">
                      <FormControl>
                        <Checkbox
                          data-testid="sso-domain-verified"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={mappingLocked || busy}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        {t('sso.domainVerified')}
                      </FormLabel>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button
                  data-testid="sso-connection-save"
                  type="submit"
                  disabled={busy || (!mappingLocked && !domainVerified)}
                >
                  {t('sso.configure.save')}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {connection && (
        <Card>
          <CardHeader>
            <CardTitle>{t('sso.access.title')}</CardTitle>
            <CardDescription>{t('sso.access.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="sso-jit">{t('sso.jit.label')}</Label>
                <p className="text-muted-foreground text-sm">
                  {t('sso.jit.description')}
                </p>
              </div>
              <Switch
                id="sso-jit"
                checked={connection.jitProvisioningEnabled}
                disabled={busy}
                onCheckedChange={(enabled) =>
                  setJit.mutate({ orgId, data: { enabled } })
                }
              />
            </div>
            <div className="flex justify-end">
              {connection.enabled ? (
                <Button
                  variant="destructive"
                  disabled={busy}
                  onClick={() =>
                    setEnabled.mutate({ orgId, data: { enabled: false } })
                  }
                >
                  {t('sso.disable.button')}
                </Button>
              ) : (
                <EnableSsoDialog
                  orgId={orgId}
                  connection={connection}
                  mutation={setEnabled}
                  disabled={busy}
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
