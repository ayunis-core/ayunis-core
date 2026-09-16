import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ayunis/ui/components/form';
import { Textarea } from '@ayunis/ui/components/textarea';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';

interface InstructionsFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  translationNamespace: string;
  translationPrefix?: string;
  disabled?: boolean;
  className?: string;
  /** Rendered next to the label, e.g. an action that rewrites the field. */
  labelAction?: ReactNode;
  /** Highlights the control while that action is running. */
  isBusy?: boolean;
}

export default function InstructionsField<TFieldValues extends FieldValues>({
  control,
  name,
  translationNamespace,
  translationPrefix = 'createDialog',
  disabled = false,
  className = 'min-h-[150px] max-h-[200px]',
  labelAction,
  isBusy = false,
}: Readonly<InstructionsFieldProps<TFieldValues>>) {
  const { t } = useTranslation(translationNamespace);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <div className="flex min-h-7 items-center justify-between gap-2">
            <FormLabel>
              {t(`${translationPrefix}.form.instructionsLabel`)}
            </FormLabel>
            {labelAction}
          </div>
          <FormControl>
            <Textarea
              placeholder={t(
                `${translationPrefix}.form.instructionsPlaceholder`,
              )}
              className={`${className} ${isBusy ? 'skill-improve-busy' : ''}`}
              disabled={disabled}
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
