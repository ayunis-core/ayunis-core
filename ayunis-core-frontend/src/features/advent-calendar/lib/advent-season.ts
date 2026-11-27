const DOOR_COUNT = 24;
const CANDLE_COUNT = 4;
const DAY_MS = 24 * 60 * 60 * 1000;

interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

const berlinDateFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Europe/Berlin',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});

/** The date in Europe/Berlin, where the doors open at midnight. */
function berlinDate(now: Date): CalendarDate {
  const parts = berlinDateFormat.formatToParts(now);
  const part = (type: 'year' | 'month' | 'day') =>
    Number(parts.find((p) => p.type === type)?.value);
  return { year: part('year'), month: part('month'), day: part('day') };
}

/** In January the season still belongs to the previous December. */
export function adventSeasonYear(now: Date): number {
  const { year, month } = berlinDate(now);
  return month === 1 ? year - 1 : year;
}

/** The door of today's date, or null outside 1–24 December. */
export function todaysDoor(now: Date): number | null {
  const { month, day } = berlinDate(now);
  return month === 12 && day <= DOOR_COUNT ? day : null;
}

function utcDay({ year, month, day }: CalendarDate): number {
  return Date.UTC(year, month - 1, day);
}

/**
 * The 4th Advent is the last Sunday before 25 December, the others are the
 * three Sundays before it.
 */
function adventSundays(seasonYear: number): number[] {
  const christmas = Date.UTC(seasonYear, 11, 25);
  const weekday = new Date(christmas).getUTCDay();
  const fourthAdvent = christmas - (weekday === 0 ? 7 : weekday) * DAY_MS;
  return Array.from(
    { length: CANDLE_COUNT },
    (_, i) => fourthAdvent - (CANDLE_COUNT - 1 - i) * 7 * DAY_MS,
  );
}

/** Candle n burns from the n-th Advent Sunday on. */
export function litCandleCount(now: Date): number {
  const today = utcDay(berlinDate(now));
  return adventSundays(adventSeasonYear(now)).filter(
    (sunday) => sunday <= today,
  ).length;
}
