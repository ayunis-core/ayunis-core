import { ROUTINE_TIME_PATTERN } from './routines.constants';

export enum RoutineFrequency {
  DAILY = 'daily',
  /** On the chosen ISO weekdays. */
  WEEKLY = 'weekly',
  /** On one day of the month, or its last day. */
  MONTHLY = 'monthly',
}

/** ISO weekdays: 1 is Monday, 7 is Sunday. */
export const ROUTINE_WEEKDAY_MIN = 1;
export const ROUTINE_WEEKDAY_MAX = 7;
/** Days up to 28 exist in every month, so no short-month rule is needed. */
export const ROUTINE_MONTH_DAY_MAX = 28;
export const ROUTINE_LAST_MONTH_DAY = 'last';

/** 1–28, or the last day of the month. */
export type RoutineMonthDay = number | typeof ROUTINE_LAST_MONTH_DAY;

/**
 * When a routine runs, at `time` (HH:mm, Europe/Berlin). A strict subset of
 * RRULE (FREQ=DAILY, FREQ=WEEKLY;BYDAY=…, FREQ=MONTHLY;BYMONTHDAY=n or -1).
 */
export type RoutineSchedule =
  | { frequency: RoutineFrequency.DAILY; time: string }
  | {
      frequency: RoutineFrequency.WEEKLY;
      time: string;
      /** Ascending, without duplicates, at least one. */
      weekdays: number[];
    }
  | {
      frequency: RoutineFrequency.MONTHLY;
      time: string;
      monthDay: RoutineMonthDay;
    };

/** A schedule as received; `weekdays` and `monthDay` only belong to their frequency. */
export interface RoutineScheduleInput {
  frequency: string;
  time: string;
  weekdays?: readonly unknown[] | null;
  monthDay?: unknown;
}

export type RoutineScheduleField = keyof RoutineScheduleInput;

export interface RoutineScheduleProblem {
  field: RoutineScheduleField;
  reason: 'invalid' | 'required' | 'not-allowed';
}

export type RoutineScheduleResult =
  | { ok: true; schedule: RoutineSchedule }
  | { ok: false; problem: RoutineScheduleProblem };

/**
 * Checks a schedule and normalizes its weekdays (ascending, deduplicated).
 * A field that does not belong to the frequency is a problem, not ignored.
 */
export function routineSchedule(
  input: RoutineScheduleInput,
): RoutineScheduleResult {
  const { frequency, time, weekdays, monthDay } = input;
  if (!isRoutineFrequency(frequency)) return problem('frequency', 'invalid');
  if (typeof time !== 'string' || !ROUTINE_TIME_PATTERN.test(time)) {
    return problem('time', 'invalid');
  }
  const foreign = foreignField(input, frequency);
  if (foreign) return problem(foreign, 'not-allowed');
  switch (frequency) {
    case RoutineFrequency.DAILY:
      return { ok: true, schedule: { frequency, time } };
    case RoutineFrequency.WEEKLY:
      return weeklySchedule(time, weekdays);
    case RoutineFrequency.MONTHLY:
      return monthlySchedule(time, monthDay);
  }
}

function foreignField(
  { weekdays, monthDay }: RoutineScheduleInput,
  frequency: RoutineFrequency,
): RoutineScheduleField | null {
  if (frequency !== RoutineFrequency.WEEKLY && weekdays !== undefined) {
    return 'weekdays';
  }
  if (frequency !== RoutineFrequency.MONTHLY && monthDay !== undefined) {
    return 'monthDay';
  }
  return null;
}

function weeklySchedule(
  time: string,
  weekdays: RoutineScheduleInput['weekdays'],
): RoutineScheduleResult {
  if (!Array.isArray(weekdays) || weekdays.length === 0) {
    return problem('weekdays', 'required');
  }
  if (!weekdays.every(isRoutineWeekday)) return problem('weekdays', 'invalid');
  const days = [...new Set(weekdays)].sort((a, b) => a - b);
  return {
    ok: true,
    schedule: { frequency: RoutineFrequency.WEEKLY, time, weekdays: days },
  };
}

function monthlySchedule(
  time: string,
  monthDay: unknown,
): RoutineScheduleResult {
  if (monthDay === undefined || monthDay === null) {
    return problem('monthDay', 'required');
  }
  if (!isRoutineMonthDay(monthDay)) return problem('monthDay', 'invalid');
  return {
    ok: true,
    schedule: { frequency: RoutineFrequency.MONTHLY, time, monthDay },
  };
}

function problem(
  field: RoutineScheduleField,
  reason: RoutineScheduleProblem['reason'],
): RoutineScheduleResult {
  return { ok: false, problem: { field, reason } };
}

function isRoutineFrequency(value: unknown): value is RoutineFrequency {
  return Object.values<unknown>(RoutineFrequency).includes(value);
}

function isRoutineWeekday(value: unknown): value is number {
  return (
    Number.isInteger(value) &&
    (value as number) >= ROUTINE_WEEKDAY_MIN &&
    (value as number) <= ROUTINE_WEEKDAY_MAX
  );
}

function isRoutineMonthDay(value: unknown): value is RoutineMonthDay {
  return (
    value === ROUTINE_LAST_MONTH_DAY ||
    (Number.isInteger(value) &&
      (value as number) >= 1 &&
      (value as number) <= ROUTINE_MONTH_DAY_MAX)
  );
}

export function describeRoutineScheduleProblem(
  problem: RoutineScheduleProblem,
): string {
  switch (problem.field) {
    case 'frequency':
      return `frequency must be one of: ${Object.values(RoutineFrequency).join(', ')}`;
    case 'time':
      return 'time must be HH:mm in 24-hour time';
    case 'weekdays':
      return problem.reason === 'not-allowed'
        ? 'weekdays are only allowed with the weekly frequency'
        : `weekly needs at least one weekday, each ${ROUTINE_WEEKDAY_MIN} (Monday) to ${ROUTINE_WEEKDAY_MAX} (Sunday)`;
    case 'monthDay':
      return problem.reason === 'not-allowed'
        ? 'a month day is only allowed with the monthly frequency'
        : `monthly needs a month day from 1 to ${ROUTINE_MONTH_DAY_MAX} or "${ROUTINE_LAST_MONTH_DAY}"`;
  }
}

export function sameRoutineSchedule(
  a: RoutineSchedule,
  b: RoutineSchedule,
): boolean {
  return (
    a.frequency === b.frequency &&
    a.time === b.time &&
    routineWeekdays(a).join(',') === routineWeekdays(b).join(',') &&
    routineMonthDay(a) === routineMonthDay(b)
  );
}

export function routineWeekdays(schedule: RoutineSchedule): number[] {
  return schedule.frequency === RoutineFrequency.WEEKLY
    ? schedule.weekdays
    : [];
}

export function routineMonthDay(
  schedule: RoutineSchedule,
): RoutineMonthDay | null {
  return schedule.frequency === RoutineFrequency.MONTHLY
    ? schedule.monthDay
    : null;
}
