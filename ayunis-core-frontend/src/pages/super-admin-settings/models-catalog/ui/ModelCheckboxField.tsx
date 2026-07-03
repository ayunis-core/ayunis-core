import type { FieldValues, Path, Control } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/shared/ui/shadcn/form';
import { Checkbox } from '@/shared/ui/shadcn/checkbox';

interface ModelCheckboxFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  disabled: boolean;
}

export function ModelCheckboxField<T extends FieldValues>({
  control,
  name,
  label,
  disabled,
}: Readonly<ModelCheckboxFieldProps<T>>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-row items-center">
          <FormControl>
            <Checkbox
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={disabled}
            />
          </FormControl>
          <FormLabel>{label}</FormLabel>
        </FormItem>
      )}
    />
  );
}
