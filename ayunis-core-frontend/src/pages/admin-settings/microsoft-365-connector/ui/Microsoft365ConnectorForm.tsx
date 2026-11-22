import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ayunis/ui/components/form';
import { Input } from '@ayunis/ui/components/input';
import { PasswordInput } from '@ayunis/ui/components/password-input';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { ConnectorStatus } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import type { Microsoft365ConnectorResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useSaveMicrosoft365Connector } from '@/pages/admin-settings/microsoft-365-connector/api/useSaveMicrosoft365Connector';
import { useRemoveMicrosoft365Connector } from '@/pages/admin-settings/microsoft-365-connector/api/useRemoveMicrosoft365Connector';
import {
  microsoft365ConnectorFormSchema,
  type Microsoft365ConnectorFormValues,
} from '@/pages/admin-settings/microsoft-365-connector/model/microsoft365ConnectorFormSchema';
import { toMicrosoft365ConnectorFormValues } from '@/pages/admin-settings/microsoft-365-connector/lib/microsoft-365-connector-form';
import { looksLikeSecretId } from '@/pages/admin-settings/microsoft-365-connector/lib/microsoft-365-connection-test';
import type { ShowConnectionTest } from '@/pages/admin-settings/microsoft-365-connector/lib/useLatestConnectionTest';

interface Microsoft365ConnectorFormProps {
  connector: Microsoft365ConnectorResponseDto;
  startRequest: () => ShowConnectionTest;
  onRemoved: () => void;
}

export function Microsoft365ConnectorForm({
  connector,
  startRequest,
  onRemoved,
}: Readonly<Microsoft365ConnectorFormProps>) {
  const { t } = useTranslation('admin-settings-connections');
  const { confirm } = useConfirmation();
  const isSetUp = connector.status === ConnectorStatus.set_up;

  const form = useForm<Microsoft365ConnectorFormValues>({
    resolver: zodResolver(
      microsoft365ConnectorFormSchema(t, { secretStored: isSetUp }),
    ),
    defaultValues: toMicrosoft365ConnectorFormValues(connector),
  });
  const { saveConnector, isSaving } = useSaveMicrosoft365Connector(
    form,
    startRequest,
  );
  const secretLooksLikeId = looksLikeSecretId(
    useWatch({ control: form.control, name: 'clientSecret' }),
  );
  const removeConnector = useRemoveMicrosoft365Connector(onRemoved);

  const handleRemove = () =>
    confirm({
      title: t('microsoft365.remove.title'),
      description: t('microsoft365.remove.description'),
      confirmText: t('microsoft365.remove.confirm'),
      cancelText: t('microsoft365.remove.cancel'),
      variant: 'destructive',
      onConfirm: () => removeConnector.mutate(),
    });

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(saveConnector)(e)}>
        <Card>
          <CardHeader>
            <CardTitle>{t('microsoft365.setup.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="tenantId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('microsoft365.setup.tenantId')}</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="off"
                      data-testid="microsoft-365-connector-tenant-id"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('microsoft365.setup.clientId')}</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="off"
                      data-testid="microsoft-365-connector-client-id"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="clientSecret"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('microsoft365.setup.clientSecret')}</FormLabel>
                  <FormControl>
                    <PasswordInput
                      autoComplete="new-password"
                      data-testid="microsoft-365-connector-client-secret"
                      {...field}
                    />
                  </FormControl>
                  {isSetUp && (
                    <FormDescription>
                      {t('microsoft365.setup.clientSecretKept')}
                    </FormDescription>
                  )}
                  {secretLooksLikeId && (
                    <p
                      className="text-sm text-warning"
                      data-testid="microsoft-365-connector-client-secret-id-warning"
                    >
                      {t('microsoft365.setup.clientSecretLooksLikeId')}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="justify-end gap-2">
            {isSetUp && (
              <Button
                type="button"
                variant="destructive-ghost"
                onClick={handleRemove}
                disabled={removeConnector.isPending || isSaving}
                data-testid="microsoft-365-connector-remove"
              >
                {t('microsoft365.remove.button')}
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSaving || removeConnector.isPending}
              data-testid="microsoft-365-connector-save"
            >
              {isSaving
                ? t('microsoft365.save.saving')
                : t('microsoft365.save.button')}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
