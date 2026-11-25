import type { ReactNode } from 'react';
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
import { Textarea } from '@ayunis/ui/components/textarea';
import { RoutineInternetAccessField } from '@/features/routines/ui/RoutineInternetAccessField';
import { RoutineScheduleField } from '@/features/routines/ui/RoutineScheduleField';
import { RoutineInputField } from '@/features/routines/ui/RoutineInputField';
import type { RoutineFormFields } from '@/features/routines/model/types';

interface RoutineFieldsProps {
  form: UseFormReturn<RoutineFormFields>;
  disabled: boolean;
}

/**
 * The routine's configuration, shared by its create dialog, configuration
 * card and the chat widgets. The model field comes from the page, since it
 * is built on the model-select widget.
 */
export function RoutineFormFieldset({
  modelField,
  ...props
}: Readonly<RoutineFieldsProps & { modelField: ReactNode }>) {
  return (
    <>
      <NameField {...props} />
      <PromptField {...props} />
      {modelField}
      <RoutineScheduleField {...props} />
      <RoutineInternetAccessField {...props} />
    </>
  );
}

function NameField({ form, disabled }: Readonly<RoutineFieldsProps>) {
  const { t } = useTranslation('routines');
  return (
    <RoutineInputField
      form={form}
      name="name"
      label={t('form.name')}
      disabled={disabled}
      testId="routine-form-name"
      inputProps={{ placeholder: t('form.namePlaceholder') }}
    />
  );
}

function PromptField({ form, disabled }: Readonly<RoutineFieldsProps>) {
  const { t } = useTranslation('routines');
  return (
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
  );
}
