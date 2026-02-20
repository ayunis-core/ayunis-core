import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/shadcn/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/shadcn/select';
import { useTranslation } from 'react-i18next';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';

interface Model {
  id: string;
  displayName: string;
}

interface ModelSelectorFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  translationNamespace: string;
  translationPrefix?: string;
  models: Model[];
  disabled?: boolean;
}

export default function ModelSelectorField<TFieldValues extends FieldValues>({
  control,
  name,
  translationNamespace,
  translationPrefix = 'createDialog',
  models,
  disabled = false,
}: Readonly<ModelSelectorFieldProps<TFieldValues>>) {
  const { t } = useTranslation(translationNamespace);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t(`${translationPrefix}.form.modelLabel`)}</FormLabel>
          <Select
            onValueChange={field.onChange}
            value={field.value}
            disabled={disabled}
          >
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={t(`${translationPrefix}.form.modelPlaceholder`)}
                />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
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
