import { describe, expect, it } from 'vitest';
import {
  addRows,
  addColumn,
  columnHasData,
  deleteColumn,
  moveColumn,
  renameColumn,
} from './spreadsheet-grid-operations';
import {
  MAX_SPREADSHEET_COLUMNS,
  MAX_SPREADSHEET_ROWS,
} from './spreadsheet-grid-state';

const state = {
  columns: ['A', 'B', 'C'],
  rows: [{ c0: 'a', c1: 'b', c2: 'c' }],
};

describe('spreadsheet grid operations', () => {
  it('addRows caps additions at the spreadsheet row limit', () => {
    const nearLimitState = {
      columns: ['A'],
      rows: Array.from({ length: MAX_SPREADSHEET_ROWS - 1 }, () => ({})),
    };

    const next = addRows(nearLimitState, 100);

    expect(next.rows).toHaveLength(MAX_SPREADSHEET_ROWS);
  });

  it('addColumn appends a column with null cells', () => {
    const next = addColumn(state, 'D');

    expect(next.columns).toEqual(['A', 'B', 'C', 'D']);
    expect(next.rows).toEqual([{ c0: 'a', c1: 'b', c2: 'c', c3: null }]);
  });

  it('addColumn does not exceed the spreadsheet column limit', () => {
    const maxedState = {
      columns: Array.from(
        { length: MAX_SPREADSHEET_COLUMNS },
        (_, index) => `Column ${index + 1}`,
      ),
      rows: [],
    };

    expect(addColumn(maxedState, 'Overflow')).toBe(maxedState);
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

  it('moveColumn reorders headers and cells', () => {
    const next = moveColumn(state, 2, 1);

    expect(next.columns).toEqual(['A', 'C', 'B']);
    expect(next.rows).toEqual([{ c0: 'a', c1: 'c', c2: 'b' }]);
  });

  it('moveColumn is a no-op for same or out-of-range indices', () => {
    expect(moveColumn(state, 1, 1)).toBe(state);
    expect(moveColumn(state, 0, 5)).toBe(state);
    expect(moveColumn(state, -1, 0)).toBe(state);
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
