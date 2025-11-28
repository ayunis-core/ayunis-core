import { useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/shadcn/select';
import { Input } from '@/shared/ui/shadcn/input';
import { Button } from '@/shared/ui/shadcn/button';
import type {
  PredefinedConfig,
  CreatePredefinedIntegrationFormData,
} from '../model/types';
import { useCreatePredefinedIntegration } from '../api/useCreatePredefinedIntegration';
import type { ConfigValueDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

interface CreatePredefinedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  predefinedConfigs: PredefinedConfig[];
  isCloud: boolean;
}

export function CreatePredefinedDialog({
  open,
  onOpenChange,
  predefinedConfigs,
  isCloud,
}: CreatePredefinedDialogProps) {
  const { t } = useTranslation('admin-settings-integrations');
  const form = useForm<CreatePredefinedIntegrationFormData>({
    defaultValues: {
      slug: undefined,
      configValues: [],
    },
  });
  const { createPredefinedIntegration, isCreating } =
    useCreatePredefinedIntegration(() => {
      onOpenChange(false);
      form.reset();
    });

  const selectedSlug = useWatch({
    control: form.control,
    name: 'slug',
  });
  const selectedConfig = useMemo(
    () => predefinedConfigs.find((c) => c.slug === selectedSlug),
    [predefinedConfigs, selectedSlug],
  );
  const credentialFields = useMemo(
    () => selectedConfig?.credentialFields ?? [],
    [selectedConfig],
  );

  useEffect(() => {
    if (!selectedConfig) {
      form.setValue('configValues', []);
      return;
    }

    const values = credentialFields.map<ConfigValueDto>((field) => {
      const existing = form
        .getValues('configValues')
        .find((value) => value.name === field.type);

      return {
        name: field.type,
        value: existing?.value ?? '',
      };
    });

    form.setValue('configValues', values);
  }, [credentialFields, form, selectedConfig]);

  const handleSubmit = (data: CreatePredefinedIntegrationFormData) => {
    const payload: CreatePredefinedIntegrationFormData = {
      slug: data.slug,
      configValues: (data.configValues ?? []).map((value) => ({
        name: value.name,
        value: value.value,
      })),
    };

    createPredefinedIntegration(payload);
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
            {isCloud
              ? t('integrations.createPredefinedDialog.titleCloud')
              : t('integrations.createPredefinedDialog.title')}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('integrations.createPredefinedDialog.integrationType')}
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ''}
                    disabled={isCreating}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t(
                            'integrations.createPredefinedDialog.integrationTypePlaceholder',
                          )}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {predefinedConfigs.map((config) => (
                        <SelectItem key={config.slug} value={config.slug}>
                          {config.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedConfig && (
                    <FormDescription>
                      {selectedConfig.description}
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedConfig && credentialFields.length > 0 && (
              <div className="space-y-4">
                {credentialFields.map((credentialField, index) => (
                  <FormField
                    key={credentialField.type}
                    control={form.control}
                    name={`configValues.${index}.value`}
                    render={({ field: valueField }) => {
                      const inputType =
                        credentialField.type === 'token' ||
                        credentialField.type === 'clientSecret'
                          ? 'password'
                          : 'text';
                      const {
                        value,
                        onChange,
                        onBlur,
                        name,
                        ref: fieldRef,
                      } = valueField;

                      return (
                        <FormItem>
                          <FormLabel>{credentialField.label}</FormLabel>
                          <FormControl>
                            <Input
                              type={inputType}
                              disabled={isCreating}
                              name={name}
                              onBlur={onBlur}
                              onChange={onChange}
                              ref={fieldRef}
                              value={value ?? ''}
                            />
                          </FormControl>
                          {credentialField.help && (
                            <FormDescription>
                              {credentialField.help}
                            </FormDescription>
                          )}
                          {!credentialField.required && (
                            <FormDescription>
                              {t(
                                'integrations.createPredefinedDialog.optionalField',
                              )}
                            </FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                ))}
              </div>
            )}

            {selectedConfig && credentialFields.length === 0 && (
              <FormDescription>
                {t('integrations.createPredefinedDialog.noCredentialsRequired')}
              </FormDescription>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isCreating}
              >
                {t('integrations.createPredefinedDialog.cancel')}
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating
                  ? t('integrations.createPredefinedDialog.creating')
                  : t('integrations.createPredefinedDialog.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
