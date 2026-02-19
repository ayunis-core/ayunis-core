import { useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/shadcn/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/shadcn/form';
import { Input } from '@/shared/ui/shadcn/input';
import { PasswordInput } from '@/shared/ui/shadcn/password-input';
import { Label } from '@/shared/ui/shadcn/label';
import { Button } from '@/shared/ui/shadcn/button';
import type { McpIntegration, UpdateIntegrationFormData } from '../model/types';
import { useUpdateIntegration } from '../api/useUpdateIntegration';
import type { MarketplaceIntegrationConfigFieldDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

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
  return schema.orgFields.filter((field) => field.value == null);
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
    },
  });

  const isMarketplace = integration?.type === 'marketplace';
  const editableFields =
    integration && isMarketplace ? getEditableOrgFields(integration) : [];
  const currentOrgValues = (integration?.orgConfigValues ?? {}) as Record<
    string,
    string
  >;

  const [configFormValues, setConfigFormValues] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    if (integration && open) {
      form.reset({
        name: integration.name,
        authHeaderName: '',
        credentials: '',
      });

      if (isMarketplace) {
        const initial: Record<string, string> = {};
        for (const field of editableFields) {
          if (field.type === 'secret') {
            // Leave secret fields empty — empty means "keep existing"
            initial[field.key] = '';
          } else {
            initial[field.key] = currentOrgValues[field.key] ?? '';
          }
        }
        setConfigFormValues(initial);
      }
    }
    // Only reset form when the dialog opens with a (potentially different) integration.
    // Derived values (editableFields, currentOrgValues, isMarketplace) are new references
    // every render — including them would cause infinite re-render loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integration, open]);

  const handleSubmit = (data: UpdateIntegrationFormData) => {
    if (!integration) return;

    const payload: UpdateIntegrationFormData = {};

    if (data.name && data.name !== integration.name) {
      payload.name = data.name;
    }

    if (isMarketplace) {
      // Build orgConfigValues: include non-secret fields always, secret fields only if non-empty
      const orgConfigValues: Record<string, string> = {};
      let hasConfigChanges = false;

      for (const field of editableFields) {
        const value = configFormValues[field.key] ?? '';
        if (field.type === 'secret') {
          // Only include if the admin entered a new value
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
    } else {
      const trimmedCredentials = data.credentials?.trim();
      if (trimmedCredentials) {
        payload.credentials = trimmedCredentials;
      }

      if (integration.authMethod === 'CUSTOM_HEADER') {
        const trimmedHeaderName = data.authHeaderName?.trim();
        if (
          trimmedHeaderName &&
          trimmedHeaderName !== integration.authHeaderName
        ) {
          payload.authHeaderName = trimmedHeaderName;
        }
      }
    }

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

              {isMarketplace && editableFields.length > 0 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {t('integrations.editDialog.configDescription')}
                  </p>
                  {editableFields.map((field) => (
                    <MarketplaceConfigFieldInput
                      key={field.key}
                      field={field}
                      value={configFormValues[field.key] ?? ''}
                      hasExistingValue={field.key in currentOrgValues}
                      onChange={(value) =>
                        setConfigFormValues((prev) => ({
                          ...prev,
                          [field.key]: value,
                        }))
                      }
                      disabled={isUpdating}
                      secretPlaceholder={t(
                        'integrations.editDialog.secretPlaceholder',
                      )}
                    />
                  ))}
                </div>
              )}

              {!isMarketplace && authMethod === 'CUSTOM_HEADER' && (
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

              {!isMarketplace && authMethod === 'BEARER_TOKEN' && (
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

              {!isMarketplace && authMethod === 'NO_AUTH' && (
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

interface MarketplaceConfigFieldInputProps {
  field: MarketplaceIntegrationConfigFieldDto;
  value: string;
  hasExistingValue: boolean;
  onChange: (value: string) => void;
  disabled: boolean;
  secretPlaceholder: string;
}

function MarketplaceConfigFieldInput({
  field,
  value,
  hasExistingValue,
  onChange,
  disabled,
  secretPlaceholder,
}: MarketplaceConfigFieldInputProps) {
  const inputId = `config-field-${field.key}`;

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>
        {field.label}
        {field.required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {field.type === 'secret' ? (
        <PasswordInput
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={
            hasExistingValue ? secretPlaceholder : (field.help ?? '')
          }
        />
      ) : (
        <Input
          id={inputId}
          type={field.type === 'url' ? 'url' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={field.help ?? ''}
        />
      )}
      {field.help && (
        <p className="text-xs text-muted-foreground">{field.help}</p>
      )}
    </div>
  );
}
