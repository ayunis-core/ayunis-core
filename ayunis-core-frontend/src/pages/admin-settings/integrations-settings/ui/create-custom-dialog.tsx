import { useFieldArray, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
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
import { Button } from '@/shared/ui/shadcn/button';
import type { CreateCustomIntegrationFormData } from '../model/types';
import { useCreateCustomIntegration } from '../api/useCreateCustomIntegration';
import { buildCustomIntegrationPayload } from '../lib/build-custom-integration-payload';
import {
  findDuplicateHeaderIndexes,
  findOAuthAuthorizationHeaderIndexes,
} from '../lib/custom-config-field-validation';
import { CustomConfigFieldEditor } from './custom-config-field-editor';
import { CustomOAuthFields } from './custom-oauth-fields';

interface CreateCustomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_VALUES: CreateCustomIntegrationFormData = {
  name: '',
  serverUrl: '',
  authType: 'CUSTOM',
  oauthClientRegistration: 'automatic',
  oauthScopes: '',
  oauthClientId: '',
  oauthClientSecret: '',
  fields: [],
};

export function CreateCustomDialog({
  open,
  onOpenChange,
}: Readonly<CreateCustomDialogProps>) {
  const { t } = useTranslation('admin-settings-integrations');
  const form = useForm<CreateCustomIntegrationFormData>({
    defaultValues: DEFAULT_VALUES,
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'fields',
  });
  const { createCustomIntegration, isCreating } = useCreateCustomIntegration(
    form,
    () => {
      onOpenChange(false);
      form.reset(DEFAULT_VALUES);
    },
  );

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isCreating) form.reset(DEFAULT_VALUES);
    onOpenChange(newOpen);
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
    for (const index of duplicateIndexes) {
      form.setError(`fields.${index}.headerName`, {
        message: t('integrations.createCustomDialog.headerDuplicate'),
      });
    }
    const oauthHeaderIndexes =
      data.authType === 'OAUTH'
        ? findOAuthAuthorizationHeaderIndexes(data.fields)
        : [];
    for (const index of oauthHeaderIndexes) {
      form.setError(`fields.${index}.headerName`, {
        message: t('integrations.createCustomDialog.oauthHeaderConflict'),
      });
    }
    if (duplicateIndexes.length > 0 || oauthHeaderIndexes.length > 0) return;
    createCustomIntegration(buildCustomIntegrationPayload(data));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {t('integrations.createCustomDialog.title')}
          </DialogTitle>
          <DialogDescription>
            {t('integrations.createCustomDialog.description')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(event) => void form.handleSubmit(submit)(event)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              rules={{ required: true }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('integrations.createCustomDialog.name')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t(
                        'integrations.createCustomDialog.namePlaceholder',
                      )}
                      {...field}
                      disabled={isCreating}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('integrations.createCustomDialog.nameDescription')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="serverUrl"
              rules={{ required: true }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('integrations.createCustomDialog.serverUrl')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder={t(
                        'integrations.createCustomDialog.serverUrlPlaceholder',
                      )}
                      {...field}
                      disabled={isCreating}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('integrations.createCustomDialog.serverUrlDescription')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <CustomOAuthFields form={form} disabled={isCreating} />

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">
                  {t('integrations.createCustomDialog.credentials')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('integrations.createCustomDialog.credentialsDescription')}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addField}
                disabled={isCreating || fields.length >= 20}
              >
                <Plus className="h-4 w-4" />
                {t('integrations.createCustomDialog.addField')}
              </Button>
            </div>

            <CustomConfigFieldEditor
              form={form}
              fields={fields}
              remove={remove}
              disabled={isCreating}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isCreating}
              >
                {t('integrations.createCustomDialog.cancel')}
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating
                  ? t('integrations.createCustomDialog.creating')
                  : t('integrations.createCustomDialog.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
