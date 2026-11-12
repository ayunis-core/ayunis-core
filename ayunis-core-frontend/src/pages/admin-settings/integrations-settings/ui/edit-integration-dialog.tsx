import { useForm, useWatch, type UseFormReturn } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ayunis/ui/components/dialog';
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
import { ConfigFieldInput } from '@/shared/ui/config-field-input';
import { Button } from '@ayunis/ui/components/button';
import type {
  McpIntegration,
  UpdateIntegrationFormData,
} from '@/pages/admin-settings/integrations-settings/model/types';
import { useUpdateIntegration } from '@/pages/admin-settings/integrations-settings/api/useUpdateIntegration';
import { hasOAuthConfiguration } from '@/shared/lib/mcp-oauth';
import {
  buildUpdatePayload,
  resolveEditableOrgFields,
} from '@/pages/admin-settings/integrations-settings/lib/build-update-integration-payload';
import { describeServerUrlChange } from '@/pages/admin-settings/integrations-settings/lib/server-url-change';
import { EditOAuthClientFields } from './edit-oauth-client-fields';
import { IntegrationInstructionsField } from './integration-instructions-field';
import { EditCustomIntegrationDialog } from './edit-custom-integration-dialog';
import { MarketplaceServerUrlField } from './marketplace-server-url-field';
import { ServerUrlChangeNotice } from './server-url-change-notice';

interface EditIntegrationDialogProps {
  integration: McpIntegration | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function OptionalOAuthClientFields({
  enabled,
  disabled,
}: Readonly<{
  enabled: boolean;
  disabled: boolean;
}>) {
  if (!enabled) return null;
  return <EditOAuthClientFields disabled={disabled} />;
}

function useResetEditForm(
  integration: McpIntegration | null,
  open: boolean,
  form: UseFormReturn<UpdateIntegrationFormData>,
): void {
  useEffect(() => {
    if (integration && open) {
      form.reset({
        name: integration.name,
        serverUrl: integration.serverUrl ?? '',
        instructions: integration.instructions ?? '',
        authHeaderName: '',
        credentials: '',
        oauthClientId: '',
        oauthClientSecret: '',
      });
    }
    // Only reset when the dialog opens with a potentially different integration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integration, open]);
}

export function EditIntegrationDialog({
  integration,
  open,
  onOpenChange,
}: Readonly<EditIntegrationDialogProps>) {
  if (integration?.type === 'custom') {
    return (
      <EditCustomIntegrationDialog
        integration={integration}
        open={open}
        onOpenChange={onOpenChange}
      />
    );
  }

  return (
    <LegacyEditIntegrationDialog
      integration={integration}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}

function LegacyEditIntegrationDialog({
  integration,
  open,
  onOpenChange,
}: Readonly<EditIntegrationDialogProps>) {
  const { t } = useTranslation('admin-settings-integrations');
  const { updateIntegration, isUpdating } = useUpdateIntegration(() => {
    onOpenChange(false);
  });
  const form = useForm<UpdateIntegrationFormData>({
    defaultValues: {
      name: '',
      serverUrl: '',
      instructions: '',
      authHeaderName: '',
      credentials: '',
      oauthClientId: '',
      oauthClientSecret: '',
    },
  });

  const isSchemaConfigured = integration?.configSchema !== undefined;
  const editableFields = resolveEditableOrgFields(
    integration,
    isSchemaConfigured,
  );
  const currentOrgValues = (integration?.orgConfigValues ?? {}) as Record<
    string,
    string
  >;
  const schema = integration?.configSchema as
    Parameters<typeof hasOAuthConfiguration>[0] | undefined;
  const hasStaticOAuthClient =
    hasOAuthConfiguration(schema) &&
    schema.oauth.clientRegistration === 'static';

  useResetEditForm(integration, open, form);

  const [configFormValues, setConfigFormValues] = useState<
    Record<string, string>
  >({});

  // Initialize the schema-configured form when the dialog opens for an
  // integration. Done during render (keyed on the integration) rather than in
  // an effect to avoid the extra commit pass flagged by
  // react-hooks/set-state-in-effect.
  const configKey =
    open && integration && isSchemaConfigured ? integration.id : null;
  const [configKeyState, setConfigKeyState] = useState<string | null>(null);
  if (configKey !== configKeyState) {
    setConfigKeyState(configKey);
    const initial: Record<string, string> = {};
    if (configKey) {
      for (const field of editableFields) {
        // Leave secret fields empty — empty means "keep existing"
        initial[field.key] =
          field.type === 'secret' ? '' : (currentOrgValues[field.key] ?? '');
      }
    }
    setConfigFormValues(initial);
  }

  const serverUrl = useWatch({ control: form.control, name: 'serverUrl' });
  const serverUrlChange =
    integration?.customerProvidesServerUrl === true
      ? describeServerUrlChange(integration, serverUrl ?? '')
      : undefined;

  const handleSubmit = (data: UpdateIntegrationFormData) => {
    if (!integration) return;
    if (
      serverUrlChange?.requiresNewOAuthClient &&
      !data.oauthClientId?.trim()
    ) {
      form.setError('oauthClientId', {
        message: t('integrations.serverUrlChange.oauthClientRequired'),
      });
      return;
    }
    const payload = buildUpdatePayload({
      data,
      integration,
      isSchemaConfigured,
      editableFields,
      configFormValues,
      currentOrgValues,
      hasStaticOAuthClient,
    });

    if (Object.keys(payload).length === 0) {
      onOpenChange(false);
      return;
    }

    updateIntegration(integration.id, payload);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isUpdating) {
      form.reset();
      setConfigFormValues({});
    }
    onOpenChange(newOpen);
  };

  const authMethod = integration?.authMethod ?? 'NO_AUTH';

  // Important: Dialog must always be rendered (not conditionally returned) so it receives
  // the open={false} transition. Without this, Radix UI won't clean up its Portal and
  // overlay, leaving an invisible layer that blocks all pointer events.
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {integration && (
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>{t('integrations.editDialog.title')}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('integrations.editDialog.name')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t(
                          'integrations.editDialog.namePlaceholder',
                        )}
                        {...field}
                        disabled={isUpdating}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <IntegrationInstructionsField disabled={isUpdating} />

              {integration.customerProvidesServerUrl && (
                <MarketplaceServerUrlField
                  hint={integration.serverUrlHint}
                  disabled={isUpdating}
                />
              )}
              {serverUrlChange && (
                <ServerUrlChangeNotice change={serverUrlChange} />
              )}

              {isSchemaConfigured && editableFields.length > 0 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {t('integrations.editDialog.configDescription')}
                  </p>
                  {editableFields.map((field) => (
                    <ConfigFieldInput
                      key={field.key}
                      field={field}
                      value={configFormValues[field.key] ?? ''}
                      onChange={(value) =>
                        setConfigFormValues((prev) => ({
                          ...prev,
                          [field.key]: value,
                        }))
                      }
                      disabled={isUpdating}
                      secretPlaceholder={
                        field.key in currentOrgValues
                          ? t('integrations.editDialog.secretPlaceholder')
                          : undefined
                      }
                    />
                  ))}
                </div>
              )}

              <OptionalOAuthClientFields
                enabled={hasStaticOAuthClient}
                disabled={isUpdating}
              />

              {!isSchemaConfigured && authMethod === 'CUSTOM_HEADER' && (
                <>
                  <FormField
                    control={form.control}
                    name="authHeaderName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('integrations.editDialog.headerName')}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder={
                              integration.authHeaderName ??
                              t('integrations.editDialog.headerNamePlaceholder')
                            }
                            {...field}
                            disabled={isUpdating}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="credentials"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('integrations.editDialog.credentials')}
                        </FormLabel>
                        <FormControl>
                          <PasswordInput
                            placeholder={t(
                              'integrations.editDialog.credentialsPlaceholder',
                            )}
                            {...field}
                            disabled={isUpdating}
                          />
                        </FormControl>
                        <FormDescription>
                          {t('integrations.editDialog.credentialsDescription')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {!isSchemaConfigured && authMethod === 'BEARER_TOKEN' && (
                <FormField
                  control={form.control}
                  name="credentials"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('integrations.editDialog.credentials')}
                      </FormLabel>
                      <FormControl>
                        <PasswordInput
                          placeholder={t(
                            'integrations.editDialog.credentialsPlaceholder',
                          )}
                          {...field}
                          disabled={isUpdating}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {!isSchemaConfigured && authMethod === 'NO_AUTH' && (
                <FormDescription>
                  {t('integrations.editDialog.noCredentialsMessage')}
                </FormDescription>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={isUpdating}
                >
                  {t('integrations.editDialog.cancel')}
                </Button>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating
                    ? t('integrations.editDialog.updating')
                    : t('integrations.editDialog.update')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      )}
    </Dialog>
  );
}
