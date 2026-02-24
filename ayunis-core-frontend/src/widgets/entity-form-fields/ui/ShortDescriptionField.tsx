import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/shadcn/form';
import { Input } from '@/shared/ui/shadcn/input';
import { Textarea } from '@/shared/ui/shadcn/textarea';
import { useTranslation } from 'react-i18next';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';

interface ShortDescriptionFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  translationNamespace: string;
  translationPrefix?: string;
  disabled?: boolean;
  multiline?: boolean;
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
          <FormLabel>
            {t(`${translationPrefix}.form.shortDescriptionLabel`)}
          </FormLabel>
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
          {hint && <FormDescription>{hint}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
