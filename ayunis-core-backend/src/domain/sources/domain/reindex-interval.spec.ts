import { InvalidReindexIntervalError } from 'src/domain/sources/application/sources.errors';
import {
  ReindexInterval,
  ReindexIntervalUnit,
} from 'src/domain/sources/domain/reindex-interval';

describe('ReindexInterval', () => {
  describe('validation', () => {
    it.each([
      ['zero weeks', 0, ReindexIntervalUnit.WEEKS],
      ['a negative number of months', -3, ReindexIntervalUnit.MONTHS],
      ['a fractional number of weeks', 1.5, ReindexIntervalUnit.WEEKS],
      ['more than a year of weeks', 53, ReindexIntervalUnit.WEEKS],
      ['more than a year of months', 13, ReindexIntervalUnit.MONTHS],
      ['not a number', Number.NaN, ReindexIntervalUnit.MONTHS],
    ])('rejects %s', (_case, value, unit) => {
      expect(() => new ReindexInterval(value, unit)).toThrow(
        InvalidReindexIntervalError,
      );
    });

    it('rejects an unknown unit', () => {
      expect(
        () => new ReindexInterval(2, 'days' as ReindexIntervalUnit),
      ).toThrow(InvalidReindexIntervalError);
    });

    it.each([
      [1, ReindexIntervalUnit.WEEKS],
      [52, ReindexIntervalUnit.WEEKS],
      [1, ReindexIntervalUnit.MONTHS],
      [12, ReindexIntervalUnit.MONTHS],
    ])('accepts %i %s', (value, unit) => {
      expect(new ReindexInterval(value, unit)).toMatchObject({ value, unit });
    });
  });

  describe('addTo', () => {
    it('adds whole weeks', () => {
      const interval = new ReindexInterval(2, ReindexIntervalUnit.WEEKS);

      expect(interval.addTo(new Date('2026-09-30T06:15:00.000Z'))).toEqual(
        new Date('2026-10-14T06:15:00.000Z'),
      );
    });

    it('adds calendar months, keeping the day of the month', () => {
      const interval = new ReindexInterval(6, ReindexIntervalUnit.MONTHS);

      expect(interval.addTo(new Date('2026-03-15T06:15:00.000Z'))).toEqual(
        new Date('2026-09-15T06:15:00.000Z'),
      );
    });

    it('clamps to the last day of a shorter month instead of spilling over', () => {
      const interval = new ReindexInterval(1, ReindexIntervalUnit.MONTHS);

      expect(interval.addTo(new Date('2027-01-31T06:15:00.000Z'))).toEqual(
        new Date('2027-02-28T06:15:00.000Z'),
      );
    });

    it('lands on February 29th in a leap year', () => {
      const interval = new ReindexInterval(1, ReindexIntervalUnit.MONTHS);

      expect(interval.addTo(new Date('2028-01-31T06:15:00.000Z'))).toEqual(
        new Date('2028-02-29T06:15:00.000Z'),
      );
    });

    it('rolls over into the next year', () => {
      const interval = new ReindexInterval(3, ReindexIntervalUnit.MONTHS);

      expect(interval.addTo(new Date('2026-11-30T06:15:00.000Z'))).toEqual(
        new Date('2027-02-28T06:15:00.000Z'),
      );
    });

    it('does not modify the date it is given', () => {
      const interval = new ReindexInterval(1, ReindexIntervalUnit.MONTHS);
      const from = new Date('2026-09-30T06:15:00.000Z');

      interval.addTo(from);

      expect(from).toEqual(new Date('2026-09-30T06:15:00.000Z'));
    });
  });
});
