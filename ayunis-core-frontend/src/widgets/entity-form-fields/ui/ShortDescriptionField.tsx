import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ayunis/ui/components/form';
import { Input } from '@ayunis/ui/components/input';
import { ProcessingGlow } from '@/shared/ui/processing-glow';
import { Textarea } from '@ayunis/ui/components/textarea';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';

interface ShortDescriptionFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  translationNamespace: string;
  translationPrefix?: string;
  disabled?: boolean;
  multiline?: boolean;
  /** Rendered right after the label text, e.g. an explanation. */
  labelHint?: ReactNode;
  /** Rendered next to the label, e.g. an action that rewrites the field. */
  labelAction?: ReactNode;
  /** Highlights the control while that action is running. */
  isBusy?: boolean;
}

export default function ShortDescriptionField<
  TFieldValues extends FieldValues,
>({
  control,
  name,
  translationNamespace,
  translationPrefix = 'createDialog',
  disabled = false,
  multiline = false,
  labelHint,
  labelAction,
  isBusy = false,
}: Readonly<ShortDescriptionFieldProps<TFieldValues>>) {
  const { t } = useTranslation(translationNamespace);
  const hintKey = `${translationPrefix}.form.shortDescriptionHint`;
  const hint = t(hintKey, { defaultValue: '' });

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <div className="flex min-h-7 items-center justify-between gap-2">
            <FormLabel className="flex items-center gap-1">
              {t(`${translationPrefix}.form.shortDescriptionLabel`)}
              {labelHint}
            </FormLabel>
            {labelAction}
          </div>
          <ProcessingGlow isActive={isBusy}>
            <FormControl>
              {multiline ? (
                <Textarea
                  placeholder={t(
                    `${translationPrefix}.form.shortDescriptionPlaceholder`,
                  )}
                  className="min-h-[80px] max-h-[200px]"
                  disabled={disabled}
                  {...field}
                />
              ) : (
                <Input
                  placeholder={t(
                    `${translationPrefix}.form.shortDescriptionPlaceholder`,
                  )}
                  disabled={disabled}
                  {...field}
                />
              )}
            </FormControl>
          </ProcessingGlow>
          {hint && <FormDescription>{hint}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
