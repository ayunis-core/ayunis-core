import type { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ayunis/ui/components/form';
import { Textarea } from '@ayunis/ui/components/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';
import { RoutineInternetAccess } from '@/features/routines/model/openapi';
import type { RoutineFormFields } from '@/features/routines/model/types';

const OPTIONS = [
  RoutineInternetAccess.off,
  RoutineInternetAccess.all,
  RoutineInternetAccess.allowlist,
] as const;

/** The domain list shows only for "only these domains", but keeps its text in the other modes. */
export function RoutineInternetAccessField({
  form,
  disabled,
}: Readonly<{ form: UseFormReturn<RoutineFormFields>; disabled: boolean }>) {
  const { t } = useTranslation('routines');
  const internetAccess = form.watch('internetAccess');

  return (
    <>
      <FormField
        control={form.control}
        name="internetAccess"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('form.internet')}</FormLabel>
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={disabled}
            >
              <FormControl>
                <SelectTrigger
                  className="w-64"
                  data-testid="routine-form-internet"
                >
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {OPTIONS.map((option) => (
                  <SelectItem
                    key={option}
                    value={option}
                    data-testid={`routine-form-internet-${option}`}
                  >
                    {t(`form.internetAccess.${option}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>{t('form.internetDescription')}</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      {internetAccess === RoutineInternetAccess.allowlist && (
        <FormField
          control={form.control}
          name="allowedDomains"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.allowedDomains')}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder={t('form.allowedDomainsPlaceholder')}
                  disabled={disabled}
                  rows={4}
                  data-testid="routine-form-allowed-domains"
                />
              </FormControl>
              <FormDescription>
                {t('form.allowedDomainsDescription')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </>
  );
}
