import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Button } from '@ayunis/ui/components/button';
import { Input } from '@ayunis/ui/components/input';
import { Textarea } from '@ayunis/ui/components/textarea';
import { useUpdateApiKey } from '@/pages/admin-settings/api-keys-settings/api/useUpdateApiKey';
import {
  API_KEY_DESCRIPTION_MAX_LENGTH,
  editApiKeyFormSchema,
  type EditApiKeyFormValues,
} from '@/pages/admin-settings/api-keys-settings/model/editApiKeyFormSchema';
import type { ApiKey } from '@/pages/admin-settings/api-keys-settings/model/types';
import { toEndOfLocalDay } from '@/pages/admin-settings/api-keys-settings/lib/to-end-of-local-day';
import { ExpiresAtFormItem } from '@/pages/admin-settings/api-keys-settings/ui/ExpiresAtFormItem';

interface EditApiKeyDialogProps {
  apiKey: ApiKey | null;
  onOpenChange: (open: boolean) => void;
}

export function EditApiKeyDialog({
  apiKey,
  onOpenChange,
}: Readonly<EditApiKeyDialogProps>) {
  const { t } = useTranslation('admin-settings-api-keys');

  const form = useForm<EditApiKeyFormValues>({
    resolver: zodResolver(editApiKeyFormSchema(t)),
    defaultValues: { name: '', description: '', expiresAt: undefined },
  });

  const { updateApiKey, isUpdating } = useUpdateApiKey(form, () =>
    onOpenChange(false),
  );

  useEffect(() => {
    if (apiKey) {
      form.reset({
        name: apiKey.name,
        description: apiKey.description ?? '',
        expiresAt: apiKey.expiresAt ? new Date(apiKey.expiresAt) : undefined,
      });
    }
  }, [apiKey, form]);

  const description = useWatch({ control: form.control, name: 'description' });

  const onSubmit = (values: EditApiKeyFormValues) => {
    if (!apiKey) return;
    // Only send the expiry when it was touched, so saving a new name never
    // shifts an expiry that was set with a time other than end of day.
    const expiryChanged = form.getFieldState('expiresAt').isDirty;
    updateApiKey(apiKey.id, {
      name: values.name,
      description: values.description || null,
      ...(expiryChanged && {
        expiresAt: values.expiresAt
          ? toEndOfLocalDay(values.expiresAt).toISOString()
          : null,
      }),
    });
  };

  return (
    <Dialog open={apiKey !== null} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[480px]"
        data-testid="api-key-edit-dialog"
      >
        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}>
            <DialogHeader>
              <DialogTitle>{t('apiKeys.editDialog.title')}</DialogTitle>
              <DialogDescription>
                {t('apiKeys.editDialog.description')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('apiKeys.editDialog.nameLabel')}</FormLabel>
                    <FormControl>
                      <Input data-testid="api-key-edit-name" {...field} />
                    </FormControl>
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
                      {t('apiKeys.editDialog.descriptionLabel')}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder={t(
                          'apiKeys.editDialog.descriptionPlaceholder',
                        )}
                        data-testid="api-key-edit-description"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('apiKeys.editDialog.descriptionHelper', {
                        count: description.length,
                        max: API_KEY_DESCRIPTION_MAX_LENGTH,
                      })}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expiresAt"
                render={({ field }) => (
                  <ExpiresAtFormItem
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t('apiKeys.editDialog.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isUpdating}
                data-testid="api-key-edit-save"
              >
                {isUpdating
                  ? t('apiKeys.editDialog.saving')
                  : t('apiKeys.editDialog.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
