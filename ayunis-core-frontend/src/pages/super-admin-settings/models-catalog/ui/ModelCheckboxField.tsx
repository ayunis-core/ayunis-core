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
        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
          <FormControl>
            <Checkbox
              checked={field.value as boolean}
              onCheckedChange={field.onChange}
              disabled={disabled}
            />
          </FormControl>
          <div className="space-y-1 leading-none">
            <FormLabel>{label}</FormLabel>
          </div>
        </FormItem>
      )}
    />
  );
}
