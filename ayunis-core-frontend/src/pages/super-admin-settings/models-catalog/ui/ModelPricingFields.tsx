import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/shadcn/form';
import { Input } from '@/shared/ui/shadcn/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/shadcn/select';
import type { ModelPricingFormData } from '../model/types';
import { CreateLanguageModelRequestDtoCurrency } from '@/shared/api/generated/ayunisCoreAPI.schemas';

const CURRENCY_OPTIONS = Object.values(
  CreateLanguageModelRequestDtoCurrency,
).map((value) => ({ value, label: value }));

interface ModelPricingFieldsProps<
  T extends FieldValues & ModelPricingFormData,
> {
  form: UseFormReturn<T>;
  disabled: boolean;
}

export function ModelPricingFields<
  T extends FieldValues & ModelPricingFormData,
>({ form, disabled }: Readonly<ModelPricingFieldsProps<T>>) {
  return (
    <div className="space-y-4 rounded-md border p-4">
      <h4 className="text-sm font-medium">Pricing (per million tokens)</h4>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name={'inputTokenCost' as Path<T>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Input Cost</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g., 3"
                  disabled={disabled}
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    field.onChange(val === '' ? undefined : Number(val));
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={'outputTokenCost' as Path<T>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Output Cost</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g., 15"
                  disabled={disabled}
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    field.onChange(val === '' ? undefined : Number(val));
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name={'currency' as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Currency</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={(field.value as string | undefined) ?? ''}
              disabled={disabled}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {CURRENCY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
