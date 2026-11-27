import { ADVENT_CALENDAR_DOOR_COUNT } from './advent-calendar.constants';

export enum AdventCalendarDoorState {
  /** Before its day; carries no content. */
  LOCKED = 'locked',
  /** Its day has come, but it has no content. */
  EMPTY = 'empty',
  OPENABLE = 'openable',
}

const LAST_SEASON_DAY_IN_JANUARY = 6;

const berlinDate = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Europe/Berlin',
  month: 'numeric',
  day: 'numeric',
});

function monthAndDayInBerlin(now: Date): { month: number; day: number } {
  const parts = berlinDate.formatToParts(now);
  const part = (type: 'month' | 'day') =>
    Number(parts.find((p) => p.type === type)?.value);
  return { month: part('month'), day: part('day') };
}

/** 1 December to 6 January, Europe/Berlin. */
export function isAdventSeason(now: Date): boolean {
  const { month, day } = monthAndDayInBerlin(now);
  return month === 12 || (month === 1 && day <= LAST_SEASON_DAY_IN_JANUARY);
}

/**
 * Door N is due from 00:00 Europe/Berlin on N December. In January the season
 * belongs to the previous year, so every door stays due until it ends.
 */
export function isDoorDue(now: Date, door: number): boolean {
  if (door < 1 || door > ADVENT_CALENDAR_DOOR_COUNT) return false;
  const { month, day } = monthAndDayInBerlin(now);
  if (month === 12) return day >= door;
  return month === 1 && day <= LAST_SEASON_DAY_IN_JANUARY;
}

export function doorState(
  now: Date,
  door: number,
  hasContent: boolean,
): AdventCalendarDoorState {
  if (!isDoorDue(now, door)) return AdventCalendarDoorState.LOCKED;
  return hasContent
    ? AdventCalendarDoorState.OPENABLE
    : AdventCalendarDoorState.EMPTY;
}
