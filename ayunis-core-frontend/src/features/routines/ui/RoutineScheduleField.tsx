import type { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ayunis/ui/components/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';
import {
  ROUTINE_MONTH_DAYS,
  ROUTINE_WEEKDAYS,
} from '@/features/routines/lib/routine-schedule';
import { RoutineFrequency } from '@/features/routines/model/openapi';
import { RoutineInputField } from '@/features/routines/ui/RoutineInputField';
import {
  LAST_MONTH_DAY,
  type RoutineFormFields,
} from '@/features/routines/model/types';

const FREQUENCIES = [
  RoutineFrequency.daily,
  RoutineFrequency.weekly,
  RoutineFrequency.monthly,
] as const;

interface ScheduleFieldProps {
  form: UseFormReturn<RoutineFormFields>;
  disabled: boolean;
}

/** Daily, weekly on chosen weekdays, or monthly on one day, at a time. */
export function RoutineScheduleField({
  form,
  disabled,
}: Readonly<ScheduleFieldProps>) {
  const { t } = useTranslation('routines');
  const frequency = form.watch('schedule.frequency');

  return (
    <div className="space-y-2" data-testid="routine-form-schedule">
      <div className="flex flex-wrap items-start gap-4">
        <FrequencyField form={form} disabled={disabled} />
        <TimeField form={form} disabled={disabled} />
      </div>
      {frequency === RoutineFrequency.weekly && (
        <WeekdaysField form={form} disabled={disabled} />
      )}
      {frequency === RoutineFrequency.monthly && (
        <MonthDayField form={form} disabled={disabled} />
      )}
      <p className="text-sm text-muted-foreground">
        {t('form.timeDescription')}
      </p>
    </div>
  );
}

function FrequencyField({ form, disabled }: Readonly<ScheduleFieldProps>) {
  const { t } = useTranslation('routines');
  return (
    <FormField
      control={form.control}
      name="schedule.frequency"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('form.schedule')}</FormLabel>
          <Select
            value={field.value}
            onValueChange={field.onChange}
            disabled={disabled}
          >
            <FormControl>
              <SelectTrigger data-testid="routine-form-frequency">
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {FREQUENCIES.map((option) => (
                <SelectItem
                  key={option}
                  value={option}
                  data-testid={`routine-form-frequency-${option}`}
                >
                  {t(`form.frequency.${option}`)}
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

function TimeField({ form, disabled }: Readonly<ScheduleFieldProps>) {
  const { t } = useTranslation('routines');
  return (
    <div className="w-32">
      <RoutineInputField
        form={form}
        name="schedule.time"
        label={t('form.time')}
        disabled={disabled}
        testId="routine-form-time"
        inputProps={{ type: 'time', step: 60 }}
      />
    </div>
  );
}

function WeekdaysField({ form, disabled }: Readonly<ScheduleFieldProps>) {
  const { t } = useTranslation('routines');
  return (
    <FormField
      control={form.control}
      name="schedule.weekdays"
      render={({ field }) => {
        const toggle = (day: number) =>
          field.onChange(
            field.value.includes(day)
              ? field.value.filter((selected) => selected !== day)
              : [...field.value, day],
          );
        return (
          <FormItem>
            <FormLabel>{t('form.weekdays')}</FormLabel>
            <FormControl>
              <div
                role="group"
                className="flex flex-wrap gap-1"
                data-testid="routine-form-weekdays"
              >
                {ROUTINE_WEEKDAYS.map((day) => {
                  const selected = field.value.includes(day);
                  return (
                    <Button
                      key={day}
                      type="button"
                      size="icon"
                      variant={selected ? 'default' : 'outline'}
                      aria-pressed={selected}
                      aria-label={t(`weekdays.long.${day}`)}
                      disabled={disabled}
                      onClick={() => toggle(day)}
                      data-testid={`routine-form-weekday-${day}`}
                    >
                      {t(`weekdays.short.${day}`)}
                    </Button>
                  );
                })}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

function MonthDayField({ form, disabled }: Readonly<ScheduleFieldProps>) {
  const { t } = useTranslation('routines');
  return (
    <FormField
      control={form.control}
      name="schedule.monthDay"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('form.monthDay')}</FormLabel>
          <Select
            value={field.value}
            onValueChange={field.onChange}
            disabled={disabled}
          >
            <FormControl>
              <SelectTrigger data-testid="routine-form-month-day">
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {ROUTINE_MONTH_DAYS.map((day) => (
                <SelectItem
                  key={day}
                  value={String(day)}
                  data-testid={`routine-form-month-day-${day}`}
                >
                  {t('form.monthDayOption', { day })}
                </SelectItem>
              ))}
              <SelectItem
                value={LAST_MONTH_DAY}
                data-testid={`routine-form-month-day-${LAST_MONTH_DAY}`}
              >
                {t('form.lastMonthDay')}
              </SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
