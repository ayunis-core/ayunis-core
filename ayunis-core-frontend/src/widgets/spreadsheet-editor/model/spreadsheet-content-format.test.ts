import { describe, expect, it } from 'vitest';
import {
  parseSpreadsheetContent,
  serializeSpreadsheetContent,
  SPREADSHEET_CONTENT_FORMAT,
} from './spreadsheet-content-format';

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

describe('serializeSpreadsheetContent', () => {
  it('round-trips content through serialize and parse', () => {
    const { data } = parseSpreadsheetContent(validRaw);

    const roundTripped = parseSpreadsheetContent(
      serializeSpreadsheetContent(data),
    );

    expect(roundTripped.isValid).toBe(true);
    expect(roundTripped.data).toEqual(data);
  });
});
