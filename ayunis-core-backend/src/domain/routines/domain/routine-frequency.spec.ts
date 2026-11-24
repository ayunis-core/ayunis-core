import {
  RoutineFrequency,
  routineSchedule,
  sameRoutineSchedule,
  type RoutineSchedule,
  type RoutineScheduleInput,
} from './routine-frequency';

const problemOf = (input: RoutineScheduleInput) => {
  const result = routineSchedule(input);
  return result.ok ? null : result.problem;
};

describe('routineSchedule', () => {
  it('accepts a daily schedule with only its time', () => {
    expect(routineSchedule({ frequency: 'daily', time: '07:00' })).toEqual({
      ok: true,
      schedule: { frequency: RoutineFrequency.DAILY, time: '07:00' },
    });
  });

  it('stores weekly weekdays ascending and without duplicates', () => {
    expect(
      routineSchedule({
        frequency: 'weekly',
        time: '08:00',
        weekdays: [5, 1, 3, 1],
      }),
    ).toEqual({
      ok: true,
      schedule: {
        frequency: RoutineFrequency.WEEKLY,
        time: '08:00',
        weekdays: [1, 3, 5],
      },
    });
  });

  it.each([1, 28, 'last'])('accepts the month day %p', (monthDay) => {
    expect(
      routineSchedule({ frequency: 'monthly', time: '08:00', monthDay }),
    ).toEqual({
      ok: true,
      schedule: {
        frequency: RoutineFrequency.MONTHLY,
        time: '08:00',
        monthDay,
      },
    });
  });

  it.each<[string, RoutineScheduleInput, object]>([
    [
      'an unknown frequency',
      { frequency: 'hourly', time: '08:00' },
      { field: 'frequency', reason: 'invalid' },
    ],
    [
      'a time that is not HH:mm',
      { frequency: 'daily', time: '8:00' },
      { field: 'time', reason: 'invalid' },
    ],
    [
      'a weekly schedule without weekdays',
      { frequency: 'weekly', time: '08:00' },
      { field: 'weekdays', reason: 'required' },
    ],
    [
      'a weekly schedule with no days',
      { frequency: 'weekly', time: '08:00', weekdays: [] },
      { field: 'weekdays', reason: 'required' },
    ],
    [
      'a weekday outside 1–7',
      { frequency: 'weekly', time: '08:00', weekdays: [0, 1] },
      { field: 'weekdays', reason: 'invalid' },
    ],
    [
      'a weekday that is not an integer',
      { frequency: 'weekly', time: '08:00', weekdays: ['1'] },
      { field: 'weekdays', reason: 'invalid' },
    ],
    [
      'weekdays with a monthly schedule',
      { frequency: 'monthly', time: '08:00', weekdays: [1], monthDay: 1 },
      { field: 'weekdays', reason: 'not-allowed' },
    ],
    [
      'weekdays with a daily schedule, even when null',
      { frequency: 'daily', time: '08:00', weekdays: null },
      { field: 'weekdays', reason: 'not-allowed' },
    ],
    [
      'a month day with a weekly schedule',
      { frequency: 'weekly', time: '08:00', weekdays: [1], monthDay: 1 },
      { field: 'monthDay', reason: 'not-allowed' },
    ],
    [
      'a monthly schedule without a day',
      { frequency: 'monthly', time: '08:00' },
      { field: 'monthDay', reason: 'required' },
    ],
    [
      'the month day 29, which not every month has',
      { frequency: 'monthly', time: '08:00', monthDay: 29 },
      { field: 'monthDay', reason: 'invalid' },
    ],
    [
      'the month day 0',
      { frequency: 'monthly', time: '08:00', monthDay: 0 },
      { field: 'monthDay', reason: 'invalid' },
    ],
    [
      'a month day given as text',
      { frequency: 'monthly', time: '08:00', monthDay: '15' },
      { field: 'monthDay', reason: 'invalid' },
    ],
  ])('rejects %s', (_case, input, problem) => {
    expect(problemOf(input)).toEqual(problem);
  });
});

describe('sameRoutineSchedule', () => {
  const weekly: RoutineSchedule = {
    frequency: RoutineFrequency.WEEKLY,
    time: '08:00',
    weekdays: [1, 4],
  };

  it('treats the same weekly schedule as unchanged', () => {
    expect(
      sameRoutineSchedule(weekly, {
        frequency: RoutineFrequency.WEEKLY,
        time: '08:00',
        weekdays: [1, 4],
      }),
    ).toBe(true);
  });

  it('sees a change of weekdays, month day or frequency at the same time', () => {
    expect(
      sameRoutineSchedule(weekly, {
        frequency: RoutineFrequency.WEEKLY,
        time: '08:00',
        weekdays: [1],
      }),
    ).toBe(false);
    expect(
      sameRoutineSchedule(
        { frequency: RoutineFrequency.MONTHLY, time: '08:00', monthDay: 1 },
        {
          frequency: RoutineFrequency.MONTHLY,
          time: '08:00',
          monthDay: 'last',
        },
      ),
    ).toBe(false);
    expect(
      sameRoutineSchedule(
        { frequency: RoutineFrequency.DAILY, time: '08:00' },
        weekly,
      ),
    ).toBe(false);
  });
});
