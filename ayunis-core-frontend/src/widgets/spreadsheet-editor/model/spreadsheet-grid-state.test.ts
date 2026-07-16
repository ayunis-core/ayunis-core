import { describe, expect, it } from 'vitest';
import {
  parseSpreadsheetContent,
  SPREADSHEET_CONTENT_FORMAT,
} from './spreadsheet-content-format';
import {
  coerceCell,
  fromGridState,
  toGridState,
} from './spreadsheet-grid-state';

const validRaw = JSON.stringify({
  format: SPREADSHEET_CONTENT_FORMAT,
  columns: ['Item', 'Amount'],
  rows: [
    ['Rent', 1200],
    ['Food', null],
  ],
});

describe('coerceCell', () => {
  it('coerces numeric-looking strings to numbers', () => {
    expect(coerceCell('42')).toBe(42);
    expect(coerceCell('-3.5')).toBe(-3.5);
    expect(coerceCell('0')).toBe(0);
    expect(coerceCell('0.5')).toBe(0.5);
  });

  it('keeps identifier-like values as strings', () => {
    expect(coerceCell('007')).toBe('007');
    expect(coerceCell('1e5')).toBe('1e5');
    expect(coerceCell(' 42')).toBe(' 42');
    expect(coerceCell('1.')).toBe('1.');
    expect(coerceCell('+49 170 1234')).toBe('+49 170 1234');
  });

  it('maps empty and missing values to null', () => {
    expect(coerceCell('')).toBeNull();
    expect(coerceCell(null)).toBeNull();
    expect(coerceCell(undefined)).toBeNull();
  });
});

describe('grid state mapping', () => {
  it('maps content to positional grid rows and back', () => {
    const { data } = parseSpreadsheetContent(validRaw);

    const state = toGridState(data);

    expect(state.rows).toEqual([
      { c0: 'Rent', c1: '1200' },
      { c0: 'Food', c1: null },
    ]);
    expect(fromGridState(state)).toEqual(data);
  });

  it('coerces on the way back only', () => {
    const state = {
      columns: ['A'],
      rows: [{ c0: '12' }, { c0: '007' }, { c0: '' }],
    };

    expect(fromGridState(state).rows).toEqual([[12], ['007'], [null]]);
  });
});
