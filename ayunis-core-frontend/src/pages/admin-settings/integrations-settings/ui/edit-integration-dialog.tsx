import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
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
import { Button } from '@/shared/ui/shadcn/button';
import type { McpIntegration, UpdateIntegrationFormData } from '../model/types';
import { useUpdateIntegration } from '../api/useUpdateIntegration';

interface EditIntegrationDialogProps {
  integration: McpIntegration | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditIntegrationDialog({
  integration,
  open,
  onOpenChange,
}: EditIntegrationDialogProps) {
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

  useEffect(() => {
    if (integration && open) {
      form.reset({
        name: integration.name,
        authHeaderName: '',
        credentials: '',
      });
    }
  }, [integration, open, form]);

  const handleSubmit = (data: UpdateIntegrationFormData) => {
    if (!integration) return;

    const payload: UpdateIntegrationFormData = {};

    if (data.name && data.name !== integration.name) {
      payload.name = data.name;
    }

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

    if (Object.keys(payload).length === 0) {
      onOpenChange(false);
      return;
    }

    updateIntegration(integration.id, payload);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isUpdating) {
      form.reset();
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

              {authMethod === 'CUSTOM_HEADER' && (
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
                              integration.authHeaderName ||
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

              {authMethod === 'BEARER_TOKEN' && (
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

              {authMethod === 'NO_AUTH' && (
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
