import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/shadcn/form';
import { Textarea } from '@/shared/ui/shadcn/textarea';
import { useTranslation } from 'react-i18next';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';

interface InstructionsFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  translationNamespace: string;
  translationPrefix?: string;
  disabled?: boolean;
  className?: string;
}

export default function InstructionsField<TFieldValues extends FieldValues>({
  control,
  name,
  translationNamespace,
  translationPrefix = 'createDialog',
  disabled = false,
  className = 'min-h-[150px] max-h-[200px]',
}: Readonly<InstructionsFieldProps<TFieldValues>>) {
  const { t } = useTranslation(translationNamespace);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {t(`${translationPrefix}.form.instructionsLabel`)}
          </FormLabel>
          <FormControl>
            <Textarea
              placeholder={t(
                `${translationPrefix}.form.instructionsPlaceholder`,
              )}
              className={className}
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
