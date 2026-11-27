const SECOND_MS = 1000;
const HOUR_MS = 60 * 60 * SECOND_MS;
const DAY_MS = 24 * HOUR_MS;

export type DoorCountdown =
  { kind: 'days'; days: number } | { kind: 'clock'; msLeft: number };

/**
 * Door N opens at 00:00 Europe/Berlin on N December. Berlin keeps UTC+1 from
 * the end of October to the end of March, so that is 23:00 UTC the day before.
 * A door is only locked before its day or after the season, so it opens in
 * the December of the current year, also when still locked in January.
 */
export function doorOpensAt(now: number, day: number): number {
  return Date.UTC(new Date(now).getUTCFullYear(), 11, day) - HOUR_MS;
}

/** Days left, or a clock for the door that opens within a day. */
export function doorCountdown(opensAt: number, now: number): DoorCountdown {
  const msLeft = opensAt - now;
  if (msLeft > DAY_MS) {
    return { kind: 'days', days: Math.ceil(msLeft / DAY_MS) };
  }
  return { kind: 'clock', msLeft: Math.max(0, msLeft) };
}

export function formatCountdownClock(msLeft: number): string {
  const totalSeconds = Math.ceil(msLeft / SECOND_MS);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
}
