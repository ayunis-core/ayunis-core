import type { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ayunis/ui/components/form';
import { Input } from '@ayunis/ui/components/input';
import { Textarea } from '@ayunis/ui/components/textarea';
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
} from '@/features/routines/model/types';

interface RoutineFormFieldsetProps {
  form: UseFormReturn<RoutineFormFields>;
  disabled: boolean;
}

/** The routine definition fields, shared by the create dialog and the configuration tab. */
export function RoutineFormFieldset({
  form,
  disabled,
}: Readonly<RoutineFormFieldsetProps>) {
  const { t } = useTranslation('routines');

  return (
    <>
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
                disabled={disabled}
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
                disabled={disabled}
                rows={10}
                data-testid="routine-form-prompt"
                required
              />
            </FormControl>
            <FormDescription>{t('form.promptDescription')}</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <ModelField form={form} disabled={disabled} />
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
                disabled={disabled}
                className="w-32"
                data-testid="routine-form-time"
                required
              />
            </FormControl>
            <FormDescription>{t('form.dailyTimeDescription')}</FormDescription>
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
              <FormDescription>{t('form.internetDescription')}</FormDescription>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={disabled}
                data-testid="routine-form-internet"
              />
            </FormControl>
          </FormItem>
        )}
      />
    </>
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
