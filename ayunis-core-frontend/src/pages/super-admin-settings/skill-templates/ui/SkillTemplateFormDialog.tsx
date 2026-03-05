import type { UseFormReturn } from 'react-hook-form';
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
import { Textarea } from '@/shared/ui/shadcn/textarea';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/shadcn/select';
import { Switch } from '@/shared/ui/shadcn/switch';
import type { CreateSkillTemplateDtoDistributionMode } from '@/shared/api';

export interface SkillTemplateFormData {
  name: string;
  shortDescription: string;
  instructions: string;
  distributionMode: CreateSkillTemplateDtoDistributionMode;
  defaultActive: boolean;
  defaultPinned: boolean;
}

interface SkillTemplateFormDialogProps {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: UseFormReturn<SkillTemplateFormData>;
  onSubmit: (data: SkillTemplateFormData) => void;
  isSubmitting: boolean;
  submitLabel: string;
  submittingLabel: string;
  hasContent?: boolean;
}

export function SkillTemplateFormDialog({
  title,
  open,
  onOpenChange,
  form,
  onSubmit,
  isSubmitting,
  submitLabel,
  submittingLabel,
  hasContent = true,
}: Readonly<SkillTemplateFormDialogProps>) {
  const { t } = useTranslation('super-admin-settings-skills');

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isSubmitting) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {hasContent && (
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('form.name')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('form.namePlaceholder')}
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
                name="shortDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('form.shortDescription')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('form.shortDescriptionPlaceholder')}
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
                name="instructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('form.instructions')}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder={t('form.instructionsPlaceholder')}
                        disabled={isSubmitting}
                        rows={6}
                        required
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="distributionMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('form.distributionMode')}</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (value !== 'pre_created_copy') {
                          form.setValue('defaultActive', false);
                          form.setValue('defaultPinned', false);
                        }
                      }}
                      value={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="always_on">
                          {t('distributionMode.always_on')}
                        </SelectItem>
                        <SelectItem value="pre_created_copy">
                          {t('distributionMode.pre_created_copy')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {t(`distributionMode.${field.value}_description`)}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch('distributionMode') === 'pre_created_copy' && (
                <>
                  <FormField
                    control={form.control}
                    name="defaultActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>{t('form.defaultActive')}</FormLabel>
                          <FormDescription>
                            {t('form.defaultActiveDescription')}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="defaultPinned"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>{t('form.defaultPinned')}</FormLabel>
                          <FormDescription>
                            {t('form.defaultPinnedDescription')}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isSubmitting}
                          />
                        </FormControl>
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
                  disabled={isSubmitting}
                >
                  {t('form.cancel')}
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
