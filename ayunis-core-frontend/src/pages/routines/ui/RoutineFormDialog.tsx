import type { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
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
import { Input } from '@ayunis/ui/components/input';
import { Textarea } from '@ayunis/ui/components/textarea';
import { Button } from '@ayunis/ui/components/button';
import { Switch } from '@ayunis/ui/components/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';
import { usePermittedModels } from '@/features/usePermittedModels';
import {
  DEFAULT_MODEL_OPTION,
  type RoutineFormFields,
} from '@/pages/routines/model/types';

interface RoutineFormDialogProps {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: UseFormReturn<RoutineFormFields>;
  onSubmit: (data: RoutineFormFields) => void;
  isSubmitting: boolean;
  submitLabel: string;
}

export function RoutineFormDialog({
  title,
  open,
  onOpenChange,
  form,
  onSubmit,
  isSubmitting,
  submitLabel,
}: Readonly<RoutineFormDialogProps>) {
  const { t } = useTranslation('routines');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
            className="space-y-4"
            data-testid="routine-form"
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
                      data-testid="routine-form-name"
                      required
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.prompt')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t('form.promptPlaceholder')}
                      disabled={isSubmitting}
                      rows={10}
                      data-testid="routine-form-prompt"
                      required
                    />
                  </FormControl>
                  <FormDescription>
                    {t('form.promptDescription')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <ModelField form={form} disabled={isSubmitting} />
            <FormField
              control={form.control}
              name="dailyTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.dailyTime')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="time"
                      step={60}
                      disabled={isSubmitting}
                      className="w-32"
                      data-testid="routine-form-time"
                      required
                    />
                  </FormControl>
                  <FormDescription>
                    {t('form.dailyTimeDescription')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="internetEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4 rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>{t('form.internet')}</FormLabel>
                    <FormDescription>
                      {t('form.internetDescription')}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                      data-testid="routine-form-internet"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {t('form.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                data-testid="routine-form-submit"
              >
                {submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ModelField({
  form,
  disabled,
}: Readonly<{ form: UseFormReturn<RoutineFormFields>; disabled: boolean }>) {
  const { t } = useTranslation('routines');
  const { models, isDisabled } = usePermittedModels();

  return (
    <FormField
      control={form.control}
      name="modelId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('form.model')}</FormLabel>
          <Select
            value={field.value}
            onValueChange={field.onChange}
            disabled={disabled || isDisabled}
          >
            <FormControl>
              <SelectTrigger data-testid="routine-form-model">
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value={DEFAULT_MODEL_OPTION}>
                {t('form.defaultModel')}
              </SelectItem>
              {models.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
