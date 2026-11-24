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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';
import { usePermittedModels } from '@/features/usePermittedModels';
import { RoutineInternetAccessField } from '@/features/routines/ui/RoutineInternetAccessField';
import { RoutineScheduleField } from '@/features/routines/ui/RoutineScheduleField';
import { RoutineInputField } from '@/features/routines/ui/RoutineInputField';
import {
  DEFAULT_MODEL_OPTION,
  type RoutineFormFields,
} from '@/features/routines/model/types';

interface RoutineFieldsProps {
  form: UseFormReturn<RoutineFormFields>;
  disabled: boolean;
}

type RoutineField = (props: Readonly<RoutineFieldsProps>) => ReactNode;

function RoutineFields({
  fields,
  form,
  disabled,
}: Readonly<RoutineFieldsProps & { fields: RoutineField[] }>) {
  // The lists are fixed, so the position identifies a field.
  return fields.map((Field, index) => (
    <Field key={index} form={form} disabled={disabled} />
  ));
}

/** The routine's configuration, shared by its configuration card and the chat widgets. */
export function RoutineFormFieldset(props: Readonly<RoutineFieldsProps>) {
  return (
    <RoutineFields
      {...props}
      fields={[
        NameField,
        PromptField,
        ModelField,
        RoutineScheduleField,
        RoutineInternetAccessField,
      ]}
    />
  );
}

/** What a new routine needs; the rest is set on its page. */
export function RoutineCreateFieldset(props: Readonly<RoutineFieldsProps>) {
  return (
    <RoutineFields
      {...props}
      fields={[NameField, PromptField, RoutineScheduleField]}
    />
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

function ModelField({ form, disabled }: Readonly<RoutineFieldsProps>) {
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
              <SelectItem
                value={DEFAULT_MODEL_OPTION}
                data-testid="routine-form-model-default"
              >
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
