import type { ReactNode } from 'react';
import type {
  FieldPath,
  FieldPathByValue,
  FieldValues,
  UseFormReturn,
} from 'react-hook-form';
import { Checkbox } from '@/shared/ui/shadcn/checkbox';
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/shared/ui/shadcn/form';
import { Label } from '@/shared/ui/shadcn/label';

interface AcceptanceCheckboxFieldProps<TFieldValues extends FieldValues> {
  readonly form: UseFormReturn<TFieldValues>;
  readonly name: FieldPathByValue<TFieldValues, boolean>;
  readonly id: string;
  readonly disabled?: boolean;
  readonly children: ReactNode;
}

export function AcceptanceCheckboxField<TFieldValues extends FieldValues>({
  form,
  name,
  id,
  disabled,
  children,
}: AcceptanceCheckboxFieldProps<TFieldValues>) {
  return (
    <FormField
      control={form.control}
      name={name as FieldPath<TFieldValues>}
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <div className="flex items-start gap-2">
              <Checkbox
                id={id}
                className="mt-0.5"
                required
                checked={Boolean(field.value)}
                onCheckedChange={field.onChange}
                disabled={disabled}
              />
              <Label htmlFor={id} className="block font-normal leading-normal">
                {children}
              </Label>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
