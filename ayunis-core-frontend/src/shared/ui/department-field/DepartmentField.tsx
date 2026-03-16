import type { UseFormReturn, FieldValues, Path } from 'react-hook-form';
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
import {
  DEPARTMENT_KEYS,
  DEPARTMENT_OTHER_MAX_LENGTH,
} from '@/shared/constants/department';

interface DepartmentFieldProps<T extends FieldValues> {
  form: UseFormReturn<T>;
  departmentName: Path<T>;
  departmentOtherName: Path<T>;
  translationPrefix: string;
  t: (key: string) => string;
}

export function DepartmentField<T extends FieldValues>({
  form,
  departmentName,
  departmentOtherName,
  translationPrefix,
  t,
}: Readonly<DepartmentFieldProps<T>>) {
  return (
    <>
      <FormField
        control={form.control}
        name={departmentName}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t(`${translationPrefix}.department`)}</FormLabel>
            <Select
              onValueChange={(value: string) => {
                field.onChange(value);
                if (value !== 'other') {
                  form.setValue(departmentOtherName, '' as never);
                  form.clearErrors(departmentOtherName);
                }
              }}
              value={(field.value as string) ?? ''}
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={t(
                      `${translationPrefix}.departmentPlaceholder`,
                    )}
                  />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {DEPARTMENT_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {t(`${translationPrefix}.departments.${key}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      {form.watch(departmentName) === 'other' && (
        <FormField
          control={form.control}
          name={departmentOtherName}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t(`${translationPrefix}.departmentOther`)}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t(
                    `${translationPrefix}.departmentOtherPlaceholder`,
                  )}
                  maxLength={DEPARTMENT_OTHER_MAX_LENGTH}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </>
  );
}
