import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ayunis/ui/components/form';
import { Button } from '@ayunis/ui/components/button';
import { Input } from '@ayunis/ui/components/input';
import { Textarea } from '@ayunis/ui/components/textarea';
import { toEndOfLocalDay } from '@/pages/admin-settings/api-keys-settings/lib/to-end-of-local-day';
import { ExpiresAtFormItem } from '@/pages/admin-settings/api-keys-settings/ui/ExpiresAtFormItem';
import { useCreateApiKey } from '@/pages/admin-settings/api-keys-settings/api/useCreateApiKey';
import {
  createApiKeyFormSchema,
  type CreateApiKeyFormValues,
} from '@/pages/admin-settings/api-keys-settings/model/createApiKeyFormSchema';
import type { CreateApiKeyResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

interface CreateApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (response: CreateApiKeyResponseDto) => void;
}

export function CreateApiKeyDialog({
  open,
  onOpenChange,
  onCreated,
}: Readonly<CreateApiKeyDialogProps>) {
  const { t } = useTranslation('admin-settings-api-keys');

  const form = useForm<CreateApiKeyFormValues>({
    resolver: zodResolver(createApiKeyFormSchema(t)),
    defaultValues: {
      name: '',
      description: '',
      expiresAt: undefined,
    },
  });

  const { createApiKey, isCreating } = useCreateApiKey(form, (response) => {
    onCreated(response);
    onOpenChange(false);
  });

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  const onSubmit = (data: CreateApiKeyFormValues) => {
    const expiresAt = data.expiresAt
      ? toEndOfLocalDay(data.expiresAt).toISOString()
      : undefined;
    createApiKey({ name: data.name, description: data.description, expiresAt });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}>
            <DialogHeader>
              <DialogTitle>{t('apiKeys.createDialog.title')}</DialogTitle>
              <DialogDescription>
                {t('apiKeys.createDialog.description')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('apiKeys.createDialog.nameLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('apiKeys.createDialog.namePlaceholder')}
                        {...field}
                      />
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
                      {t('apiKeys.createDialog.descriptionLabel')}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder={t(
                          'apiKeys.editDialog.descriptionPlaceholder',
                        )}
                        {...field}
                      />
                    </FormControl>
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
                {t('apiKeys.createDialog.cancel')}
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating
                  ? t('apiKeys.createDialog.creating')
                  : t('apiKeys.createDialog.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
