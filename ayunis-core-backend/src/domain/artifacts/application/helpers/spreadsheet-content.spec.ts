import {
  mapSpreadsheetStrings,
  parseSpreadsheetContent,
  serializeSpreadsheetContent,
  SPREADSHEET_CONTENT_FORMAT,
} from './spreadsheet-content';
import {
  ArtifactContentTooLargeError,
  InvalidSpreadsheetContentError,
  MAX_SPREADSHEET_COLUMNS,
  MAX_SPREADSHEET_ROWS,
} from '../artifacts.errors';

describe('spreadsheet-content', () => {
  const validContent = JSON.stringify({
    format: SPREADSHEET_CONTENT_FORMAT,
    columns: ['Item', 'Amount'],
    rows: [
      ['Rent', 1200],
      ['Food', 450.5],
      ['Misc', null],
    ],
  });

  describe('parseSpreadsheetContent', () => {
    it('should parse valid spreadsheet content', () => {
      const result = parseSpreadsheetContent(validContent);

      expect(result.format).toBe(SPREADSHEET_CONTENT_FORMAT);
      expect(result.columns).toEqual(['Item', 'Amount']);
      expect(result.rows).toEqual([
        ['Rent', 1200],
        ['Food', 450.5],
        ['Misc', null],
      ]);
    });

    it('should reject content that is not valid JSON', () => {
      expect(() => parseSpreadsheetContent('not json {')).toThrow(
        InvalidSpreadsheetContentError,
      );
    });

    it('should reject JSON that is not an object', () => {
      expect(() => parseSpreadsheetContent('[1, 2, 3]')).toThrow(
        InvalidSpreadsheetContentError,
      );
      expect(() => parseSpreadsheetContent('"text"')).toThrow(
        InvalidSpreadsheetContentError,
      );
    });

    it('should reject content with a wrong or missing format literal', () => {
      const wrongFormat = JSON.stringify({
        format: 'spreadsheet-v2',
        columns: ['A'],
        rows: [],
      });
      const missingFormat = JSON.stringify({ columns: ['A'], rows: [] });

      expect(() => parseSpreadsheetContent(wrongFormat)).toThrow(
        InvalidSpreadsheetContentError,
      );
      expect(() => parseSpreadsheetContent(missingFormat)).toThrow(
        InvalidSpreadsheetContentError,
      );
    });

    it('should reject empty or non-array columns', () => {
      const emptyColumns = JSON.stringify({
        format: SPREADSHEET_CONTENT_FORMAT,
        columns: [],
        rows: [],
      });
      const nonArrayColumns = JSON.stringify({
        format: SPREADSHEET_CONTENT_FORMAT,
        columns: 'Item',
        rows: [],
      });

      expect(() => parseSpreadsheetContent(emptyColumns)).toThrow(
        InvalidSpreadsheetContentError,
      );
      expect(() => parseSpreadsheetContent(nonArrayColumns)).toThrow(
        InvalidSpreadsheetContentError,
      );
    });

    it('should reject non-string column headers', () => {
      const content = JSON.stringify({
        format: SPREADSHEET_CONTENT_FORMAT,
        columns: ['Item', 42],
        rows: [],
      });

      expect(() => parseSpreadsheetContent(content)).toThrow(
        InvalidSpreadsheetContentError,
      );
    });

    it('should reject more columns than the maximum', () => {
      const content = JSON.stringify({
        format: SPREADSHEET_CONTENT_FORMAT,
        columns: Array.from(
          { length: MAX_SPREADSHEET_COLUMNS + 1 },
          (_, i) => `Col ${i}`,
        ),
        rows: [],
      });

      expect(() => parseSpreadsheetContent(content)).toThrow(
        InvalidSpreadsheetContentError,
      );
    });

    it('should reject more rows than the maximum', () => {
      const content = JSON.stringify({
        format: SPREADSHEET_CONTENT_FORMAT,
        columns: ['A'],
        rows: Array.from({ length: MAX_SPREADSHEET_ROWS + 1 }, () => ['x']),
      });

      expect(() => parseSpreadsheetContent(content)).toThrow(
        InvalidSpreadsheetContentError,
      );
    });

    it('should reject rows that are not arrays', () => {
      const content = JSON.stringify({
        format: SPREADSHEET_CONTENT_FORMAT,
        columns: ['A'],
        rows: ['not-an-array'],
      });

      expect(() => parseSpreadsheetContent(content)).toThrow(
        InvalidSpreadsheetContentError,
      );
    });

    it('should reject cells that are not string, number, or null', () => {
      const withObject = JSON.stringify({
        format: SPREADSHEET_CONTENT_FORMAT,
        columns: ['A'],
        rows: [[{ nested: true }]],
      });
      const withBoolean = JSON.stringify({
        format: SPREADSHEET_CONTENT_FORMAT,
        columns: ['A'],
        rows: [[true]],
      });

      expect(() => parseSpreadsheetContent(withObject)).toThrow(
        InvalidSpreadsheetContentError,
      );
      expect(() => parseSpreadsheetContent(withBoolean)).toThrow(
        InvalidSpreadsheetContentError,
      );
    });

    it('should accept ragged rows (normalization happens on serialize)', () => {
      const content = JSON.stringify({
        format: SPREADSHEET_CONTENT_FORMAT,
        columns: ['A', 'B'],
        rows: [['only-one-cell']],
      });

      const result = parseSpreadsheetContent(content);

      expect(result.rows).toEqual([['only-one-cell']]);
    });
  });

  describe('serializeSpreadsheetContent', () => {
    it('should serialize with the format literal and round-trip through parse', () => {
      const serialized = serializeSpreadsheetContent({
        columns: ['Item', 'Amount'],
        rows: [['Rent', 1200]],
      });

      const parsed = parseSpreadsheetContent(serialized);
      expect(parsed.format).toBe(SPREADSHEET_CONTENT_FORMAT);
      expect(parsed.columns).toEqual(['Item', 'Amount']);
      expect(parsed.rows).toEqual([['Rent', 1200]]);
    });

    it('should pad short rows with null to the column count', () => {
      const serialized = serializeSpreadsheetContent({
        columns: ['A', 'B', 'C'],
        rows: [['x']],
      });

      expect(parseSpreadsheetContent(serialized).rows).toEqual([
        ['x', null, null],
      ]);
    });

    it('should truncate rows longer than the column count', () => {
      const serialized = serializeSpreadsheetContent({
        columns: ['A', 'B'],
        rows: [['x', 'y', 'z']],
      });

      expect(parseSpreadsheetContent(serialized).rows).toEqual([['x', 'y']]);
    });

    it('should reject more columns than the maximum', () => {
      expect(() =>
        serializeSpreadsheetContent({
          columns: Array.from(
            { length: MAX_SPREADSHEET_COLUMNS + 1 },
            (_, i) => `Col ${i}`,
          ),
          rows: [],
        }),
      ).toThrow(InvalidSpreadsheetContentError);
    });

    it('should reject more rows than the maximum', () => {
      expect(() =>
        serializeSpreadsheetContent({
          columns: ['A'],
          rows: Array.from({ length: MAX_SPREADSHEET_ROWS + 1 }, () => ['x']),
        }),
      ).toThrow(InvalidSpreadsheetContentError);
    });

    it('should reject non-finite numbers', () => {
      expect(() =>
        serializeSpreadsheetContent({
          columns: ['A'],
          rows: [[Number.NaN]],
        }),
      ).toThrow(InvalidSpreadsheetContentError);
      expect(() =>
        serializeSpreadsheetContent({
          columns: ['A'],
          rows: [[Number.POSITIVE_INFINITY]],
        }),
      ).toThrow(InvalidSpreadsheetContentError);
    });

    it('should reject serialized content exceeding the maximum length', () => {
      expect(() =>
        serializeSpreadsheetContent({
          columns: ['A', 'B'],
          rows: Array.from({ length: 300 }, () => ['x'.repeat(2000), null]),
        }),
      ).toThrow(ArtifactContentTooLargeError);
    });

    it('should be idempotent for already-canonical content', () => {
      const first = serializeSpreadsheetContent({
        columns: ['A', 'B'],
        rows: [['x', 1]],
      });
      const second = serializeSpreadsheetContent(
        parseSpreadsheetContent(first),
      );

      expect(second).toBe(first);
    });
  });

  describe('mapSpreadsheetStrings', () => {
    it('should map headers and string cells, skipping numbers and nulls', () => {
      const data = parseSpreadsheetContent(validContent);

      const result = mapSpreadsheetStrings(data, (value) =>
        value.toUpperCase(),
      );

      expect(result.columns).toEqual(['ITEM', 'AMOUNT']);
      expect(result.rows).toEqual([
        ['RENT', 1200],
        ['FOOD', 450.5],
        ['MISC', null],
      ]);
    });

    it('should not mutate the input', () => {
      const data = parseSpreadsheetContent(validContent);

      mapSpreadsheetStrings(data, () => 'changed');

      expect(data.columns).toEqual(['Item', 'Amount']);
      expect(data.rows[0]).toEqual(['Rent', 1200]);
    });
  });
});
