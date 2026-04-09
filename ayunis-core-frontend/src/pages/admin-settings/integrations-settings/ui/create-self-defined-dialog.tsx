import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Switch } from '@/shared/ui/shadcn/switch';
import { Textarea } from '@/shared/ui/shadcn/textarea';
import { Button } from '@/shared/ui/shadcn/button';
import { useCreateSelfDefinedIntegration } from '../api/useCreateSelfDefinedIntegration';
import type {
  CreateSelfDefinedIntegrationFormFields,
  CreateSelfDefinedIntegrationPayload,
} from '../model/types';

interface CreateSelfDefinedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateSelfDefinedDialog({
  open,
  onOpenChange,
}: Readonly<CreateSelfDefinedDialogProps>) {
  const { t } = useTranslation('admin-settings-integrations');
  const form = useForm<CreateSelfDefinedIntegrationFormFields>({
    defaultValues: {
      name: '',
      description: '',
      serverUrl: '',
      returnsPii: false,
      configSchema: '',
      oauthClientId: '',
      oauthClientSecret: '',
    },
  });

  const {
    createSelfDefinedIntegration,
    clearSchemaError,
    schemaError,
    isCreating,
  } = useCreateSelfDefinedIntegration(form, () => {
    onOpenChange(false);
    form.reset();
  });

  const configSchemaValue = useWatch({
    control: form.control,
    name: 'configSchema',
  });
  const parsedLiveSchema = parseSchema(configSchemaValue);
  const showsOAuthClientFields = isOAuthSchema(parsedLiveSchema);
  const hasRawConfigSchema = configSchemaValue.trim().length > 0;
  const configSchemaJsonError =
    hasRawConfigSchema && !parsedLiveSchema
      ? t('integrations.createSelfDefinedDialog.errorInvalidJson')
      : null;

  const handleSubmit = (values: CreateSelfDefinedIntegrationFormFields) => {
    const parsedSchema = parseSchema(values.configSchema);
    if (!parsedSchema) {
      form.setError('configSchema', {
        message: t('integrations.createSelfDefinedDialog.errorInvalidJson'),
      });
      return;
    }

    form.clearErrors('configSchema');
    const schemaUsesOAuth = isOAuthSchema(parsedSchema);
    const payload: CreateSelfDefinedIntegrationPayload = {
      name: values.name.trim(),
      description: values.description.trim() || undefined,
      serverUrl: values.serverUrl.trim(),
      returnsPii: values.returnsPii,
      configSchema: parsedSchema,
      orgConfigValues: {},
      oauthClientId:
        schemaUsesOAuth && values.oauthClientId.trim()
          ? values.oauthClientId.trim()
          : undefined,
      oauthClientSecret:
        schemaUsesOAuth && values.oauthClientSecret.trim()
          ? values.oauthClientSecret.trim()
          : undefined,
    };

    createSelfDefinedIntegration(payload);
  };

  const handleFormatJson = () => {
    const parsedSchema = parseSchema(form.getValues('configSchema'));
    if (!parsedSchema) {
      form.setError('configSchema', {
        message: t('integrations.createSelfDefinedDialog.errorInvalidJson'),
      });
      return;
    }

    form.clearErrors('configSchema');
    form.setValue('configSchema', JSON.stringify(parsedSchema, null, 2), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isCreating) {
      form.reset();
      clearSchemaError();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>
            {t('integrations.createSelfDefinedDialog.title')}
          </DialogTitle>
          <DialogDescription>
            {t('integrations.createSelfDefinedDialog.description')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={(event) => void form.handleSubmit(handleSubmit)(event)}
          >
            <FormField
              control={form.control}
              name="name"
              rules={{
                validate: (value) =>
                  value.trim().length > 0 ||
                  t('integrations.createSelfDefinedDialog.nameRequired'),
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('integrations.createSelfDefinedDialog.name')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t(
                        'integrations.createSelfDefinedDialog.namePlaceholder',
                      )}
                      disabled={isCreating}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('integrations.createSelfDefinedDialog.nameDescription')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('integrations.createSelfDefinedDialog.descriptionLabel')}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t(
                        'integrations.createSelfDefinedDialog.descriptionPlaceholder',
                      )}
                      disabled={isCreating}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="serverUrl"
              rules={{
                required: t(
                  'integrations.createSelfDefinedDialog.serverUrlRequired',
                ),
                validate: (value) =>
                  isValidHttpUrl(value) ||
                  t(
                    'integrations.createSelfDefinedDialog.errorInvalidServerUrl',
                  ),
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('integrations.createSelfDefinedDialog.serverUrl')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="url"
                      placeholder={t(
                        'integrations.createSelfDefinedDialog.serverUrlPlaceholder',
                      )}
                      disabled={isCreating}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="returnsPii"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>
                      {t('integrations.createSelfDefinedDialog.returnsPii')}
                    </FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isCreating}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="configSchema"
              rules={{
                required: t(
                  'integrations.createSelfDefinedDialog.configSchemaRequired',
                ),
              }}
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-3">
                    <FormLabel>
                      {t('integrations.createSelfDefinedDialog.configSchema')}
                    </FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleFormatJson}
                      disabled={isCreating}
                    >
                      {t('integrations.createSelfDefinedDialog.formatJson')}
                    </Button>
                  </div>
                  <FormControl>
                    <Textarea
                      className="min-h-64 font-mono"
                      placeholder={t(
                        'integrations.createSelfDefinedDialog.configSchemaPlaceholder',
                      )}
                      disabled={isCreating}
                      value={field.value}
                      onChange={(event) => {
                        clearSchemaError();
                        field.onChange(event);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('integrations.createSelfDefinedDialog.configSchemaHelp')}
                  </FormDescription>
                  {schemaError && (
                    <p className="text-sm font-medium text-destructive">
                      {schemaError.message}
                    </p>
                  )}
                  {configSchemaJsonError && (
                    <p className="text-sm font-medium text-destructive">
                      {configSchemaJsonError}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {showsOAuthClientFields && (
              <>
                <FormField
                  control={form.control}
                  name="oauthClientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t(
                          'integrations.createSelfDefinedDialog.oauthClientId',
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t(
                            'integrations.createSelfDefinedDialog.oauthClientIdPlaceholder',
                          )}
                          disabled={isCreating}
                        />
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
                      <FormLabel>
                        {t(
                          'integrations.createSelfDefinedDialog.oauthClientSecret',
                        )}
                      </FormLabel>
                      <FormControl>
                        <PasswordInput
                          {...field}
                          placeholder={t(
                            'integrations.createSelfDefinedDialog.oauthClientSecretPlaceholder',
                          )}
                          disabled={isCreating}
                        />
                      </FormControl>
                      <FormDescription>
                        {t(
                          'integrations.createSelfDefinedDialog.oauthClientHelp',
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isCreating}
              >
                {t('integrations.createSelfDefinedDialog.cancel')}
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating
                  ? t('integrations.createSelfDefinedDialog.creating')
                  : t('integrations.createSelfDefinedDialog.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function parseSchema(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isOAuthSchema(schema: Record<string, unknown> | null): boolean {
  return schema?.authType === 'OAUTH';
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
