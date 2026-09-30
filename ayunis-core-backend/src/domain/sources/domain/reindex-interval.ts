import { InvalidReindexIntervalError } from 'src/domain/sources/application/sources.errors';

export enum ReindexIntervalUnit {
  WEEKS = 'weeks',
  MONTHS = 'months',
}

/**
 * At most a year between runs: a content refresh rarer than that is not a
 * schedule anyone relies on, and the bound keeps typos like "100 months" out.
 */
export const REINDEX_INTERVAL_MAX_VALUE: Readonly<
  Record<ReindexIntervalUnit, number>
> = {
  [ReindexIntervalUnit.WEEKS]: 52,
  [ReindexIntervalUnit.MONTHS]: 12,
};

/** How often a source is re-indexed automatically, e.g. every 2 weeks. */
export class ReindexInterval {
  readonly value: number;
  readonly unit: ReindexIntervalUnit;

  constructor(value: number, unit: ReindexIntervalUnit) {
    if (!Object.values(ReindexIntervalUnit).includes(unit)) {
      throw new InvalidReindexIntervalError(value, unit);
    }
    if (
      !Number.isInteger(value) ||
      value < 1 ||
      value > REINDEX_INTERVAL_MAX_VALUE[unit]
    ) {
      throw new InvalidReindexIntervalError(value, unit);
    }
    this.value = value;
    this.unit = unit;
  }

  /**
   * Calendar arithmetic in UTC, matching Postgres' `+ make_interval(...)`
   * in a UTC session: a month step past the end of a shorter month lands on
   * its last day (Jan 31 + 1 month = Feb 28/29), never spills into the next.
   */
  addTo(date: Date): Date {
    if (this.unit === ReindexIntervalUnit.WEEKS) {
      const result = new Date(date);
      result.setUTCDate(result.getUTCDate() + 7 * this.value);
      return result;
    }
    return addUtcMonths(date, this.value);
  }
}

function addUtcMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const dayOfMonth = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDayOfMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(dayOfMonth, lastDayOfMonth));
  return result;
}
