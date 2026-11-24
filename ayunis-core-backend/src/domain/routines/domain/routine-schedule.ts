import type { UUID } from 'crypto';
import type { Routine } from './routine.entity';
import {
  ROUTINE_LAST_MONTH_DAY,
  RoutineFrequency,
  sameRoutineSchedule,
  type RoutineSchedule,
} from './routine-frequency';
import {
  ROUTINE_START_SPREAD_MINUTES,
  ROUTINE_TIME_ZONE,
} from './routines.constants';

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;
/** Covers the longest gap between two monthly runs, from yesterday on. */
const MAX_CANDIDATE_DAYS = 62;

const WALL_CLOCK = new Intl.DateTimeFormat('en-US', {
  timeZone: ROUTINE_TIME_ZONE,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  hourCycle: 'h23',
});

/** The schedule fields an edit changes; omitted properties stay unchanged. */
export interface RoutineScheduleChanges {
  nextRunAt?: Date | null;
  consecutiveFailureCount?: 0;
  pausedAt?: null;
}

/**
 * Spreads routines that share a time over a few minutes. Derived from the
 * (random) id so it stays the same for a routine across days and replicas.
 */
export function routineStartOffsetMinutes(routineId: UUID): number {
  return (
    Number.parseInt(routineId.slice(0, 8), 16) % ROUTINE_START_SPREAD_MINUTES
  );
}

/**
 * The first scheduled start strictly after `after`: the time in Europe/Berlin
 * on the first day the schedule matches, plus the routine's start offset. A
 * time skipped by the switch to summer time runs an hour later; a time
 * repeated by the switch back runs at its first occurrence.
 */
export function nextRoutineRunAt(
  routine: Pick<Routine, 'id' | 'schedule'>,
  after: Date,
): Date {
  const { schedule } = routine;
  const offsetMs = routineStartOffsetMinutes(routine.id) * MINUTE_MS;
  const today = berlinDate(after);
  // Starts at yesterday: its start can still be ahead when the offset pushed
  // it past midnight.
  for (let days = -1; days < MAX_CANDIDATE_DAYS; days++) {
    const date = addDays(today, days);
    if (!matchesRoutineSchedule(schedule, date)) continue;
    const start = berlinWallTimeToInstant(date, schedule.time) + offsetMs;
    if (start > after.getTime()) return new Date(start);
  }
  throw new Error(`No run within ${MAX_CANDIDATE_DAYS} days`);
}

/** Whether the schedule runs on a Berlin date (`YYYY-MM-DD`). */
export function matchesRoutineSchedule(
  schedule: RoutineSchedule,
  date: string,
): boolean {
  const [year, month, day] = date.split('-').map(Number);
  switch (schedule.frequency) {
    case RoutineFrequency.DAILY:
      return true;
    case RoutineFrequency.WEEKLY:
      return schedule.weekdays.includes(isoWeekday(year, month, day));
    case RoutineFrequency.MONTHLY:
      return schedule.monthDay === ROUTINE_LAST_MONTH_DAY
        ? day === daysInMonth(year, month)
        : day === schedule.monthDay;
  }
}

/**
 * Whether a due run still starts: a missed run is caught up later the same
 * Berlin day, otherwise skipped.
 */
export function isCatchUpDue(dueAt: Date, now: Date): boolean {
  return berlinDate(dueAt) === berlinDate(now);
}

/**
 * Identifies one scheduled start, `YYYY-MM-DD-HHmm` in Berlin time: each
 * start runs once, and a time changed to later the same day is a new start.
 */
export function scheduledRunKey(startAt: Date): string {
  const { year, month, day, hour, minute } = berlinWallClock(startAt.getTime());
  return `${isoDate(year, month, day)}-${pad(hour)}${pad(minute)}`;
}

/**
 * How an edit moves the schedule. Disabling removes the scheduled run;
 * re-enabling schedules the next one and clears the pause and the failure
 * count; any change to the schedule reschedules an enabled routine. An
 * unchanged schedule keeps a pending (possibly due) run.
 */
export function scheduleChangesForEdit(
  current: Pick<
    Routine,
    'id' | 'schedule' | 'enabled' | 'nextRunAt' | 'pausedAt'
  >,
  changes: { schedule?: RoutineSchedule; enabled?: boolean },
  now: Date,
): RoutineScheduleChanges {
  const enabled = changes.enabled ?? current.enabled;
  const schedule = changes.schedule ?? current.schedule;
  if (!enabled) return current.enabled ? { nextRunAt: null } : {};
  const nextRunAt = nextRoutineRunAt({ id: current.id, schedule }, now);
  if (!current.enabled) {
    return { nextRunAt, consecutiveFailureCount: 0, pausedAt: null };
  }
  if (
    !sameRoutineSchedule(schedule, current.schedule) ||
    current.nextRunAt === null
  ) {
    return { nextRunAt };
  }
  return {};
}

function berlinDate(at: Date): string {
  const { year, month, day } = berlinWallClock(at.getTime());
  return isoDate(year, month, day);
}

function berlinWallClock(instant: number) {
  const parts = Object.fromEntries(
    WALL_CLOCK.formatToParts(instant).map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

/** The Berlin wall-clock reading of an instant, as if it were UTC. */
function berlinWallClockMs(instant: number): number {
  const { year, month, day, hour, minute } = berlinWallClock(instant);
  return Date.UTC(year, month - 1, day, hour, minute);
}

function berlinWallTimeToInstant(date: string, time: string): number {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  // A day away from the wanted time, the zone is in its offset from before
  // and after any transition on that day.
  const offsetBefore = berlinWallClockMs(wall - DAY_MS) - (wall - DAY_MS);
  const offsetAfter = berlinWallClockMs(wall + DAY_MS) - (wall + DAY_MS);
  const matches = [wall - offsetBefore, wall - offsetAfter].filter(
    (instant) => berlinWallClockMs(instant) === wall,
  );
  // No match: the time falls into the spring-forward gap.
  return matches.length > 0 ? Math.min(...matches) : wall - offsetBefore;
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return isoDate(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate(),
  );
}

function isoWeekday(year: number, month: number, day: number): number {
  return ((new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7) + 1;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}
