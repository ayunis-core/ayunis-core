import type { ComponentProps } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ayunis/ui/components/form';
import { Input } from '@ayunis/ui/components/input';
import type { RoutineFormFields } from '@/features/routines/model/types';

interface RoutineInputFieldProps {
  form: UseFormReturn<RoutineFormFields>;
  name: 'name' | 'schedule.time';
  label: string;
  disabled: boolean;
  testId: string;
  inputProps?: Pick<
    ComponentProps<typeof Input>,
    'type' | 'step' | 'placeholder'
  >;
}

/** A required one-line input with its label and validation message. */
export function RoutineInputField({
  form,
  name,
  label,
  disabled,
  testId,
  inputProps,
}: Readonly<RoutineInputFieldProps>) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              {...inputProps}
              {...field}
              disabled={disabled}
              data-testid={testId}
              required
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
