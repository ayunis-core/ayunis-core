import type { PastChatActivityRange } from 'src/domain/threads/domain/past-chat-scope';

export const UTC_DATE_PATTERN = '^\\d{4}-\\d{2}-\\d{2}$';

const DAY_MS = 24 * 60 * 60 * 1000;

/** `from` and `to` must be calendar dates, `from` not after `to`. */
export function assertUtcDateRange(from?: string, to?: string): void {
  if (from !== undefined) assertCalendarDate('from', from);
  if (to !== undefined) assertCalendarDate('to', to);
  if (from !== undefined && to !== undefined && from > to) {
    throw new Error(`'from' (${from}) must not be after 'to' (${to})`);
  }
}

/** Whole UTC days: `to` includes its day. */
export function toUtcDayRange(
  from?: string,
  to?: string,
): PastChatActivityRange {
  return {
    ...(from && { from: new Date(`${from}T00:00:00.000Z`) }),
    ...(to && {
      before: new Date(new Date(`${to}T00:00:00.000Z`).getTime() + DAY_MS),
    }),
  };
}

function assertCalendarDate(name: string, value: string): void {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error(`'${name}' must be a calendar date, received '${value}'`);
  }
}
