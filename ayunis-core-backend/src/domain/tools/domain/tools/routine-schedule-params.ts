import {
  describeRoutineScheduleProblem,
  ROUTINE_LAST_MONTH_DAY,
  ROUTINE_MONTH_DAY_MAX,
  ROUTINE_WEEKDAY_MAX,
  ROUTINE_WEEKDAY_MIN,
  RoutineFrequency,
  routineSchedule,
  type RoutineMonthDay,
} from 'src/domain/routines/domain/routine-frequency';

export const routineScheduleParameter = {
  type: 'object' as const,
  description:
    'When the routine runs: daily, weekly on chosen weekdays, or monthly on one day. Only daily, weekly and monthly are possible; never every few weeks, on a weekday of the month (such as the first Monday) or several times a day.',
  properties: {
    frequency: {
      type: 'string' as const,
      enum: [
        RoutineFrequency.DAILY,
        RoutineFrequency.WEEKLY,
        RoutineFrequency.MONTHLY,
      ] as const,
    },
    time: {
      type: 'string' as const,
      pattern: '^([01]\\d|2[0-3]):[0-5]\\d$',
      description:
        'The time of day the routine runs, as HH:mm in 24-hour German time (Europe/Berlin)',
    },
    weekdays: {
      type: 'array' as const,
      items: {
        type: 'integer' as const,
        minimum: ROUTINE_WEEKDAY_MIN,
        maximum: ROUTINE_WEEKDAY_MAX,
      },
      minItems: 1,
      description:
        'Only and required for "weekly": the ISO weekdays it runs on, 1 = Monday to 7 = Sunday; Monday to Friday is [1, 2, 3, 4, 5].',
    },
    month_day: {
      anyOf: [
        {
          type: 'integer' as const,
          minimum: 1,
          maximum: ROUTINE_MONTH_DAY_MAX,
        },
        { type: 'string' as const, enum: [ROUTINE_LAST_MONTH_DAY] as const },
      ],
      description: `Only and required for "monthly": the day of the month, 1 to ${ROUTINE_MONTH_DAY_MAX}, or "${ROUTINE_LAST_MONTH_DAY}" for the last day of the month. Days 29 to 31 are not possible; for the end of the month use "${ROUTINE_LAST_MONTH_DAY}".`,
    },
  },
  required: ['frequency', 'time'] as const,
  additionalProperties: false,
};

export interface RoutineScheduleParams {
  frequency: RoutineFrequency;
  time: string;
  weekdays?: number[];
  month_day?: RoutineMonthDay;
}

const PARAM_NAMES = {
  frequency: 'frequency',
  time: 'time',
  weekdays: 'weekdays',
  monthDay: 'month_day',
} as const;

/** The API's rules for a schedule, so a proposal it would refuse goes back to the model. */
export function assertValidRoutineScheduleParams(
  schedule: RoutineScheduleParams,
): void {
  const result = routineSchedule({
    frequency: schedule.frequency,
    time: schedule.time,
    weekdays: schedule.weekdays,
    monthDay: schedule.month_day,
  });
  if (!result.ok) {
    throw new Error(
      `Invalid parameters: schedule.${PARAM_NAMES[result.problem.field]}: ${describeRoutineScheduleProblem(result.problem)}`,
    );
  }
}
