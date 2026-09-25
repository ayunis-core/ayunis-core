import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ayunis/ui/components/form';
import { Textarea } from '@ayunis/ui/components/textarea';
import { ProcessingGlow } from '@/shared/ui/processing-glow';
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
  labelHint?: ReactNode;
  labelAction?: ReactNode;
  isBusy?: boolean;
}

export default function InstructionsField<TFieldValues extends FieldValues>({
  control,
  name,
  translationNamespace,
  translationPrefix = 'createDialog',
  disabled = false,
  className = 'min-h-[150px] max-h-[200px]',
  labelHint,
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
            <FormLabel className="flex items-center gap-1">
              {t(`${translationPrefix}.form.instructionsLabel`)}
              {labelHint}
            </FormLabel>
            {labelAction}
          </div>
          <ProcessingGlow isActive={isBusy}>
            <FormControl>
              <Textarea
                placeholder={t(
                  `${translationPrefix}.form.instructionsPlaceholder`,
                )}
                className={className}
                disabled={disabled}
                readOnly={isBusy}
                {...field}
              />
            </FormControl>
          </ProcessingGlow>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
