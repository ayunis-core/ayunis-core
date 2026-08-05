import { useForm, type UseFormReturn } from 'react-hook-form';
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
import type { McpIntegration, UpdateIntegrationFormData } from '../model/types';
import { useUpdateIntegration } from '../api/useUpdateIntegration';
import type { MarketplaceIntegrationConfigFieldDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { hasOAuthConfiguration } from '@/shared/lib/mcp-oauth';
import { EditOAuthClientFields } from './edit-oauth-client-fields';

interface EditIntegrationDialogProps {
  integration: McpIntegration | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ConfigSchema {
  orgFields: MarketplaceIntegrationConfigFieldDto[];
}

function getEditableOrgFields(
  integration: McpIntegration,
): MarketplaceIntegrationConfigFieldDto[] {
  const schema = integration.configSchema as ConfigSchema | undefined;
  if (!schema?.orgFields) return [];
  return schema.orgFields.filter(
    (field) => field.value === null || field.value === undefined,
  );
}

function resolveEditableOrgFields(
  integration: McpIntegration | null,
  isSchemaConfigured: boolean,
): MarketplaceIntegrationConfigFieldDto[] {
  if (!integration || !isSchemaConfigured) return [];
  return getEditableOrgFields(integration);
}

function buildConfigPayload(
  payload: UpdateIntegrationFormData,
  editableFields: MarketplaceIntegrationConfigFieldDto[],
  configFormValues: Record<string, string>,
  currentOrgValues: Record<string, string>,
): void {
  const orgConfigValues: Record<string, string> = {};
  let hasConfigChanges = false;

  for (const field of editableFields) {
    const value = configFormValues[field.key] ?? '';
    if (field.type === 'secret') {
      if (value.trim()) {
        orgConfigValues[field.key] = value;
        hasConfigChanges = true;
      }
    } else {
      orgConfigValues[field.key] = value;
      if (value !== (currentOrgValues[field.key] ?? '')) {
        hasConfigChanges = true;
      }
    }
  }

  if (hasConfigChanges) {
    payload.orgConfigValues = orgConfigValues;
  }
}

function buildAuthPayload(
  payload: UpdateIntegrationFormData,
  data: UpdateIntegrationFormData,
  integration: McpIntegration,
): void {
  const trimmedCredentials = data.credentials?.trim();
  if (trimmedCredentials) {
    payload.credentials = trimmedCredentials;
  }

  if (integration.authMethod === 'CUSTOM_HEADER') {
    const trimmedHeaderName = data.authHeaderName?.trim();
    if (trimmedHeaderName && trimmedHeaderName !== integration.authHeaderName) {
      payload.authHeaderName = trimmedHeaderName;
    }
  }
}

interface BuildUpdatePayloadInput {
  data: UpdateIntegrationFormData;
  integration: McpIntegration;
  isSchemaConfigured: boolean;
  editableFields: MarketplaceIntegrationConfigFieldDto[];
  configFormValues: Record<string, string>;
  currentOrgValues: Record<string, string>;
  hasStaticOAuthClient: boolean;
}

function buildUpdatePayload({
  data,
  integration,
  isSchemaConfigured,
  editableFields,
  configFormValues,
  currentOrgValues,
  hasStaticOAuthClient,
}: BuildUpdatePayloadInput): UpdateIntegrationFormData {
  const payload: UpdateIntegrationFormData = {};
  if (data.name && data.name !== integration.name) payload.name = data.name;

  if (!isSchemaConfigured) {
    buildAuthPayload(payload, data, integration);
    return payload;
  }

  buildConfigPayload(
    payload,
    editableFields,
    configFormValues,
    currentOrgValues,
  );
  const clientId = data.oauthClientId?.trim();
  if (hasStaticOAuthClient && clientId) {
    const clientSecret = data.oauthClientSecret?.trim();
    payload.oauthClient = {
      clientId,
      ...(clientSecret ? { clientSecret } : {}),
    };
  }
  return payload;
}

function OptionalOAuthClientFields({
  enabled,
  form,
  disabled,
}: Readonly<{
  enabled: boolean;
  form: UseFormReturn<UpdateIntegrationFormData>;
  disabled: boolean;
}>) {
  if (!enabled) return null;
  return <EditOAuthClientFields form={form} disabled={disabled} />;
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
  const { t } = useTranslation('admin-settings-integrations');
  const { updateIntegration, isUpdating } = useUpdateIntegration(() => {
    onOpenChange(false);
  });
  const form = useForm<UpdateIntegrationFormData>({
    defaultValues: {
      name: '',
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

  const handleSubmit = (data: UpdateIntegrationFormData) => {
    if (!integration) return;
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
                form={form}
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
