import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ayunis/ui/components/dialog';
import { Form, FormDescription } from '@ayunis/ui/components/form';
import type {
  CreateCustomIntegrationFormData,
  McpIntegration,
} from '@/pages/admin-settings/integrations-settings/model/types';
import type { CustomMcpConfigSchemaDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useUpdateIntegration } from '@/pages/admin-settings/integrations-settings/api/useUpdateIntegration';
import {
  buildCustomIntegrationUpdatePayload,
  toEditCustomIntegrationFormData,
} from '@/pages/admin-settings/integrations-settings/lib/edit-custom-integration';
import {
  findDuplicateHeaderIndexes,
  findOAuthAuthorizationHeaderIndexes,
} from '@/pages/admin-settings/integrations-settings/lib/custom-config-field-validation';
import { CustomConfigFieldEditor } from './custom-config-field-editor';
import { CustomIntegrationIdentityFields } from './custom-integration-identity-fields';
import { EditOAuthClientFields } from './edit-oauth-client-fields';

interface EditCustomIntegrationDialogProps {
  integration: McpIntegration;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCustomIntegrationDialog({
  integration,
  open,
  onOpenChange,
}: Readonly<EditCustomIntegrationDialogProps>) {
  const { t } = useTranslation('admin-settings-integrations');
  const form = useForm<CreateCustomIntegrationFormData>({
    defaultValues: toEditCustomIntegrationFormData(integration),
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'fields',
  });
  const { updateIntegration, isUpdating } = useUpdateIntegration(() => {
    onOpenChange(false);
  });

  useEffect(() => {
    if (open) form.reset(toEditCustomIntegrationFormData(integration));
  }, [form, integration, open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !isUpdating) {
      form.reset(toEditCustomIntegrationFormData(integration));
    }
    onOpenChange(nextOpen);
  };

  const addField = () => {
    append({
      key: `field_${crypto.randomUUID().replaceAll('-', '')}`,
      scope: 'organization',
      label: '',
      type: 'secret',
      headerName: '',
      prefix: '',
      required: true,
      help: '',
      value: '',
    });
  };

  const submit = (data: CreateCustomIntegrationFormData) => {
    const duplicateIndexes = findDuplicateHeaderIndexes(data.fields);
    const oauthHeaderIndexes =
      data.authType === 'OAUTH'
        ? findOAuthAuthorizationHeaderIndexes(data.fields)
        : [];
    setHeaderErrors(form, duplicateIndexes, oauthHeaderIndexes, t);
    if (duplicateIndexes.length > 0 || oauthHeaderIndexes.length > 0) return;

    const payload = buildCustomIntegrationUpdatePayload(data, integration);
    if (Object.keys(payload).length === 0) {
      onOpenChange(false);
      return;
    }
    updateIntegration(integration.id, payload);
  };

  const isOAuth = form.getValues('authType') === 'OAUTH';
  const hasStaticOAuthClient =
    isOAuth && form.getValues('oauthClientRegistration') === 'static';
  const storedSecretKeys = new Set(
    Object.keys(integration.orgConfigValues ?? {}).filter((key) =>
      fields.some((field) => field.key === key && field.type === 'secret'),
    ),
  );
  const configSchema =
    integration.configSchema as unknown as CustomMcpConfigSchemaDto;
  const lockedFieldKeys = new Set(
    [...configSchema.orgFields, ...configSchema.userFields].map(
      (field) => field.key,
    ),
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('integrations.editDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('integrations.editDialog.customDescription')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(event) => void form.handleSubmit(submit)(event)}
            className="space-y-4"
          >
            <CustomIntegrationIdentityFields
              form={form}
              disabled={isUpdating}
              serverUrlTestId="integration-edit-server-url"
            />
            <FormDescription>
              {t('integrations.editDialog.authMethodDescription', {
                method: isOAuth
                  ? t('integrations.oauth.oauth')
                  : t('integrations.oauth.customHeaders'),
              })}
            </FormDescription>
            <CustomConfigFieldEditor
              form={form}
              fields={fields}
              remove={remove}
              disabled={isUpdating}
              storedSecretKeys={storedSecretKeys}
              lockedFieldKeys={lockedFieldKeys}
              testIdPrefix="integration-edit-field"
            />
            <Button
              type="button"
              variant="outline"
              onClick={addField}
              disabled={isUpdating}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('integrations.createCustomDialog.addField')}
            </Button>
            {hasStaticOAuthClient && (
              <EditOAuthClientFields disabled={isUpdating} />
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
              <Button
                type="submit"
                disabled={isUpdating}
                data-testid="integration-edit-submit"
              >
                {isUpdating
                  ? t('integrations.editDialog.updating')
                  : t('integrations.editDialog.update')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function setHeaderErrors(
  form: ReturnType<typeof useForm<CreateCustomIntegrationFormData>>,
  duplicateIndexes: number[],
  oauthHeaderIndexes: number[],
  t: (key: string) => string,
): void {
  for (const index of duplicateIndexes) {
    form.setError(`fields.${index}.headerName`, {
      message: t('integrations.createCustomDialog.headerDuplicate'),
    });
  }
  for (const index of oauthHeaderIndexes) {
    form.setError(`fields.${index}.headerName`, {
      message: t('integrations.createCustomDialog.oauthHeaderConflict'),
    });
  }
}
