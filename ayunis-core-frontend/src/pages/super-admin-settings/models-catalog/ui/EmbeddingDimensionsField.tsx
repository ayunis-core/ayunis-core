import type { UseFormReturn } from 'react-hook-form';
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
import type { EmbeddingModelFormData } from '../model/types';

const DIMENSIONS = [
  { value: 1024, label: '1024' },
  { value: 1536, label: '1536' },
  { value: 2560, label: '2560' },
] as const;

interface EmbeddingDimensionsFieldProps {
  form: UseFormReturn<EmbeddingModelFormData>;
  disabled: boolean;
  /** Use "value" for controlled (edit) mode, "defaultValue" for uncontrolled (create) mode */
  mode: 'create' | 'edit';
}

export function EmbeddingDimensionsField({
  form,
  disabled,
  mode,
}: Readonly<EmbeddingDimensionsFieldProps>) {
  return (
    <FormField
      control={form.control}
      name="dimensions"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Dimensions</FormLabel>
          <Select
            onValueChange={(value) => field.onChange(Number(value))}
            {...(mode === 'edit'
              ? { value: String(field.value) }
              : { defaultValue: String(field.value) })}
            disabled={disabled}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select dimensions" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {DIMENSIONS.map((dim) => (
                <SelectItem key={dim.value} value={String(dim.value)}>
                  {dim.label}
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
