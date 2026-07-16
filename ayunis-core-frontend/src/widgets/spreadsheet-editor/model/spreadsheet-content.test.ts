import { describe, expect, it } from 'vitest';
import {
  addColumn,
  coerceCell,
  columnHasData,
  deleteColumn,
  fromGridState,
  isFormulaValue,
  parseSpreadsheetContent,
  renameColumn,
  serializeSpreadsheetContent,
  toGridState,
  SPREADSHEET_CONTENT_FORMAT,
} from './spreadsheet-content';

const validRaw = JSON.stringify({
  format: SPREADSHEET_CONTENT_FORMAT,
  columns: ['Item', 'Amount'],
  rows: [
    ['Rent', 1200],
    ['Food', null],
  ],
});

describe('parseSpreadsheetContent', () => {
  it('parses valid content', () => {
    const { data, isValid } = parseSpreadsheetContent(validRaw);

    expect(isValid).toBe(true);
    expect(data.columns).toEqual(['Item', 'Amount']);
    expect(data.rows).toEqual([
      ['Rent', 1200],
      ['Food', null],
    ]);
  });

  it('falls back to an empty sheet on garbage input', () => {
    for (const raw of ['not json {', '[1,2]', '"text"', 'null']) {
      const { data, isValid } = parseSpreadsheetContent(raw);
      expect(isValid).toBe(false);
      expect(data).toEqual({ columns: [], rows: [] });
    }
  });

  it('falls back on wrong format literal', () => {
    const raw = JSON.stringify({
      format: 'spreadsheet-v2',
      columns: ['A'],
      rows: [],
    });

    expect(parseSpreadsheetContent(raw).isValid).toBe(false);
  });

  it('pads and truncates ragged rows to the column count', () => {
    const raw = JSON.stringify({
      format: SPREADSHEET_CONTENT_FORMAT,
      columns: ['A', 'B'],
      rows: [['only'], ['x', 'y', 'extra']],
    });

    const { data, isValid } = parseSpreadsheetContent(raw);

    expect(isValid).toBe(true);
    expect(data.rows).toEqual([
      ['only', null],
      ['x', 'y'],
    ]);
  });

  it('sanitizes invalid cells to null instead of failing', () => {
    const raw = JSON.stringify({
      format: SPREADSHEET_CONTENT_FORMAT,
      columns: ['A', 'B'],
      rows: [[true, { nested: 1 }]],
    });

    const { data, isValid } = parseSpreadsheetContent(raw);

    expect(isValid).toBe(true);
    expect(data.rows).toEqual([[null, null]]);
  });
});

describe('serialize round trip', () => {
  it('round-trips content through serialize and parse', () => {
    const { data } = parseSpreadsheetContent(validRaw);

    const roundTripped = parseSpreadsheetContent(
      serializeSpreadsheetContent(data),
    );

    expect(roundTripped.isValid).toBe(true);
    expect(roundTripped.data).toEqual(data);
  });
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

  it('keeps formulas as strings — the persistence contract for formula cells', () => {
    expect(coerceCell('=SUM(B2:B4)')).toBe('=SUM(B2:B4)');
    expect(coerceCell('=B2*2')).toBe('=B2*2');
  });
});

describe('isFormulaValue', () => {
  it('detects formula values by the leading equals sign', () => {
    expect(isFormulaValue('=SUM(B2:B4)')).toBe(true);
    expect(isFormulaValue('plain')).toBe(false);
    expect(isFormulaValue('a = b')).toBe(false);
    expect(isFormulaValue(null)).toBe(false);
    expect(isFormulaValue(undefined)).toBe(false);
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

describe('column operations', () => {
  const state = {
    columns: ['A', 'B', 'C'],
    rows: [{ c0: 'a', c1: 'b', c2: 'c' }],
  };

  it('addColumn appends a column with null cells', () => {
    const next = addColumn(state, 'D');

    expect(next.columns).toEqual(['A', 'B', 'C', 'D']);
    expect(next.rows).toEqual([{ c0: 'a', c1: 'b', c2: 'c', c3: null }]);
  });

  it('renameColumn changes only the header, cells stay put', () => {
    const next = renameColumn(state, 1, 'Renamed');

    expect(next.columns).toEqual(['A', 'Renamed', 'C']);
    expect(next.rows).toBe(state.rows);
  });

  it('deleteColumn removes the column and shifts later keys down', () => {
    const next = deleteColumn(state, 1);

    expect(next.columns).toEqual(['A', 'C']);
    expect(next.rows).toEqual([{ c0: 'a', c1: 'c' }]);
  });

  it('columnHasData detects non-empty cells', () => {
    const sparse = {
      columns: ['A', 'B'],
      rows: [
        { c0: 'x', c1: null },
        { c0: '', c1: '' },
      ],
    };

    expect(columnHasData(sparse, 0)).toBe(true);
    expect(columnHasData(sparse, 1)).toBe(false);
  });
});
