import { useEffect, useRef } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/shadcn/select';
import { Input } from '@/shared/ui/shadcn/input';
import { PasswordInput } from '@/shared/ui/shadcn/password-input';
import { Button } from '@/shared/ui/shadcn/button';
import type { CreateCustomIntegrationFormData } from '../model/types';
import { useCreateCustomIntegration } from '../api/useCreateCustomIntegration';

interface CreateCustomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCustomDialog({
  open,
  onOpenChange,
}: CreateCustomDialogProps) {
  const { t } = useTranslation('admin-settings-integrations');
  const form = useForm<CreateCustomIntegrationFormData>({
    defaultValues: {
      name: '',
      serverUrl: '',
      authMethod: 'NO_AUTH',
      authHeaderName: '',
      credentials: '',
    },
  });
  const { createCustomIntegration, isCreating } = useCreateCustomIntegration(
    () => {
      onOpenChange(false);
      form.reset();
    },
  );

  const selectedAuthMethod = useWatch({
    control: form.control,
    name: 'authMethod',
  });

  const previousAuthMethod =
    useRef<typeof selectedAuthMethod>(selectedAuthMethod);

  useEffect(() => {
    if (previousAuthMethod.current === selectedAuthMethod) {
      return;
    }

    if (!selectedAuthMethod || selectedAuthMethod === 'NO_AUTH') {
      form.setValue('credentials', '');
      form.setValue('authHeaderName', '');
    }

    if (selectedAuthMethod === 'BEARER_TOKEN') {
      form.setValue('authHeaderName', '');
    }

    previousAuthMethod.current = selectedAuthMethod;
  }, [form, selectedAuthMethod]);

  const handleSubmit = (data: CreateCustomIntegrationFormData) => {
    const payload: CreateCustomIntegrationFormData = {
      name: data.name,
      serverUrl: data.serverUrl,
      authMethod: data.authMethod,
    };

    if (data.authMethod && data.authMethod !== 'NO_AUTH') {
      const trimmedCredentials = data.credentials?.trim();
      if (trimmedCredentials) {
        payload.credentials = trimmedCredentials;
      }

      if (data.authMethod === 'CUSTOM_HEADER') {
        const trimmedHeaderName = data.authHeaderName?.trim();
        if (trimmedHeaderName) {
          payload.authHeaderName = trimmedHeaderName;
        }
      }
    } else {
      payload.authMethod =
        data.authMethod === 'NO_AUTH' ? 'NO_AUTH' : undefined;
    }

    createCustomIntegration(payload);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isCreating) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[525px]">
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
            onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
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
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('integrations.createCustomDialog.serverUrl')}
                  </FormLabel>
                  <FormControl>
                    <Input
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

            <FormField
              control={form.control}
              name="authMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('integrations.createCustomDialog.authMethod')}
                  </FormLabel>
                  <Select
                    onValueChange={(value) =>
                      field.onChange(
                        value as CreateCustomIntegrationFormData['authMethod'],
                      )
                    }
                    value={field.value ?? undefined}
                    disabled={isCreating}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t(
                            'integrations.createCustomDialog.authMethodNone',
                          )}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="NO_AUTH">
                        {t('integrations.createCustomDialog.authMethodNone')}
                      </SelectItem>
                      <SelectItem value="CUSTOM_HEADER">
                        {t('integrations.createCustomDialog.authMethodApiKey')}
                      </SelectItem>
                      <SelectItem value="BEARER_TOKEN">
                        {t(
                          'integrations.createCustomDialog.authMethodBearerToken',
                        )}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t('integrations.createCustomDialog.authMethodDescription')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedAuthMethod === 'CUSTOM_HEADER' && (
              <>
                <FormField
                  control={form.control}
                  name="authHeaderName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('integrations.createCustomDialog.headerName')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t(
                            'integrations.createCustomDialog.headerNamePlaceholder',
                          )}
                          {...field}
                          disabled={isCreating}
                        />
                      </FormControl>
                      <FormDescription>
                        {t(
                          'integrations.createCustomDialog.headerNameDescription',
                        )}
                      </FormDescription>
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
                        {t('integrations.createCustomDialog.credentials')}
                      </FormLabel>
                      <FormControl>
                        <PasswordInput
                          placeholder={t(
                            'integrations.createCustomDialog.credentialsPlaceholder',
                          )}
                          {...field}
                          disabled={isCreating}
                        />
                      </FormControl>
                      <FormDescription>
                        {t(
                          'integrations.createCustomDialog.credentialsDescriptionApiKey',
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {selectedAuthMethod === 'BEARER_TOKEN' && (
              <FormField
                control={form.control}
                name="credentials"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('integrations.createCustomDialog.credentials')}
                    </FormLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder={t(
                          'integrations.createCustomDialog.credentialsPlaceholder',
                        )}
                        {...field}
                        disabled={isCreating}
                      />
                    </FormControl>
                    <FormDescription>
                      {t(
                        'integrations.createCustomDialog.credentialsDescriptionBearerToken',
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
