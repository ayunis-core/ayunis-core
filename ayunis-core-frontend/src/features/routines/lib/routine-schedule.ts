import type { TFunction } from 'i18next';
import {
  RoutineFrequency,
  type RoutineSchedule,
} from '@/features/routines/model/openapi';
import {
  LAST_MONTH_DAY,
  type RoutineScheduleFields,
} from '@/features/routines/model/types';

export const ROUTINE_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
export const ROUTINE_MONTH_DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

/** Monday and the 1st, so switching to weekly or monthly starts from a valid choice. */
export const DEFAULT_SCHEDULE_FIELDS: RoutineScheduleFields = {
  frequency: RoutineFrequency.daily,
  time: '07:00',
  weekdays: [1],
  monthDay: '1',
};

/** Fields of the other frequencies keep their defaults, ready for a switch. */
export function scheduleToFields(
  schedule: RoutineSchedule,
): RoutineScheduleFields {
  return {
    frequency: schedule.frequency,
    time: schedule.time,
    weekdays: schedule.weekdays ?? DEFAULT_SCHEDULE_FIELDS.weekdays,
    monthDay:
      schedule.monthDay === undefined
        ? DEFAULT_SCHEDULE_FIELDS.monthDay
        : String(schedule.monthDay),
  };
}

/** Only the chosen frequency's fields are sent; the API rejects the others. */
export function fieldsToSchedule(
  fields: RoutineScheduleFields,
): RoutineSchedule {
  const { frequency, time } = fields;
  switch (frequency) {
    case RoutineFrequency.daily:
      return { frequency, time };
    case RoutineFrequency.weekly:
      return {
        frequency,
        time,
        weekdays: [...fields.weekdays].sort((a, b) => a - b),
      };
    case RoutineFrequency.monthly:
      return {
        frequency,
        time,
        monthDay:
          fields.monthDay === LAST_MONTH_DAY
            ? LAST_MONTH_DAY
            : Number(fields.monthDay),
      };
  }
}

/** E.g. "Täglich um 07:00", "Mo, Do um 07:00", "Monatlich am 15. um 07:00". */
export function describeRoutineSchedule(
  schedule: RoutineSchedule,
  t: TFunction,
): string {
  const { time } = schedule;
  switch (schedule.frequency) {
    case RoutineFrequency.daily:
      return t('scheduleSummary.daily', { time });
    case RoutineFrequency.weekly:
      return t('scheduleSummary.weekly', {
        time,
        days: (schedule.weekdays ?? [])
          .map((day) => t(`weekdays.short.${day}`))
          .join(', '),
      });
    case RoutineFrequency.monthly:
      return schedule.monthDay === LAST_MONTH_DAY
        ? t('scheduleSummary.monthlyLast', { time })
        : t('scheduleSummary.monthly', { time, day: schedule.monthDay });
  }
}
