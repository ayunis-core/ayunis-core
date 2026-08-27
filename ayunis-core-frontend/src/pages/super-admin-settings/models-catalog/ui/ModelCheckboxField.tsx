import type { FieldValues, Path, Control } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@ayunis/ui/components/form';
import { Checkbox } from '@ayunis/ui/components/checkbox';

interface ModelCheckboxFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  disabled: boolean;
  testId?: string;
}

export function ModelCheckboxField<T extends FieldValues>({
  control,
  name,
  label,
  disabled,
  testId,
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
              data-testid={testId}
            />
          </FormControl>
          <FormLabel>{label}</FormLabel>
        </FormItem>
      )}
    />
  );
}
