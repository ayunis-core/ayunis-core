import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/shadcn/form';
import { Input } from '@/shared/ui/shadcn/input';
import { useTranslation } from 'react-i18next';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';

interface ShortDescriptionFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  translationNamespace: string;
  translationPrefix?: string;
  disabled?: boolean;
}

export default function ShortDescriptionField<
  TFieldValues extends FieldValues,
>({
  control,
  name,
  translationNamespace,
  translationPrefix = 'createDialog',
  disabled = false,
}: Readonly<ShortDescriptionFieldProps<TFieldValues>>) {
  const { t } = useTranslation(translationNamespace);

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
            <Input
              placeholder={t(
                `${translationPrefix}.form.shortDescriptionPlaceholder`,
              )}
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
