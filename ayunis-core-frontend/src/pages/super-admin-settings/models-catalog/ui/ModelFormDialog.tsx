import type { ReactNode } from 'react';
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/shadcn/form';
import { Input } from '@/shared/ui/shadcn/input';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/shadcn/select';
import { Checkbox } from '@/shared/ui/shadcn/checkbox';

interface BaseModelFormData extends FieldValues {
  name: string;
  provider: string;
  displayName: string;
  isArchived: boolean;
}

interface ProviderOption {
  value: string;
  label: string;
}

interface ModelFormDialogProps<T extends BaseModelFormData> {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: UseFormReturn<T>;
  onSubmit: (data: T) => void;
  isSubmitting: boolean;
  mode: 'create' | 'edit';
  providers: readonly ProviderOption[];
  namePlaceholder: string;
  displayNamePlaceholder: string;
  /** Extra fields rendered between displayName and isArchived */
  children?: ReactNode;
  /** When false, DialogContent is not rendered (used by edit dialogs when model is null) */
  hasContent?: boolean;
}

export function ModelFormDialog<T extends BaseModelFormData>({
  title,
  open,
  onOpenChange,
  form,
  onSubmit,
  isSubmitting,
  mode,
  providers,
  namePlaceholder,
  displayNamePlaceholder,
  children,
  hasContent = true,
}: Readonly<ModelFormDialogProps<T>>) {
  const { t } = useTranslation('super-admin-settings-org');
  const submitLabel = t(
    `models.catalog.dialog.${mode === 'create' ? 'create' : 'update'}`,
  );
  const submittingLabel = t(
    `models.catalog.dialog.${mode === 'create' ? 'creating' : 'updating'}`,
  );
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isSubmitting) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {hasContent && (
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
              className="flex min-h-0 flex-1 flex-col gap-4"
            >
              {/* Not ScrollArea: Radix needs a fixed viewport height, but this dialog sizes to content */}
              <div className="-mx-1 min-h-0 flex-1 space-y-4 overflow-y-auto px-1">
                <FormField
                  control={form.control}
                  name={'name' as Path<T>}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('models.catalog.dialog.name')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={namePlaceholder}
                          disabled={isSubmitting}
                          required
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={'provider' as Path<T>}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('models.catalog.dialog.provider')}
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t(
                                'models.catalog.dialog.providerPlaceholder',
                              )}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {providers.map((provider) => (
                            <SelectItem
                              key={provider.value}
                              value={provider.value}
                            >
                              {provider.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={'displayName' as Path<T>}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('models.catalog.dialog.displayName')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={displayNamePlaceholder}
                          disabled={isSubmitting}
                          required
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {children}

                <FormField
                  control={form.control}
                  name={'isArchived' as Path<T>}
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormLabel>
                        {t('models.catalog.dialog.archived')}
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={isSubmitting}
                >
                  {t('models.catalog.dialog.cancel')}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? submittingLabel : submitLabel}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      )}
    </Dialog>
  );
}
