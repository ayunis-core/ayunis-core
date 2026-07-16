import { describe, expect, it } from 'vitest';
import { coerceCell } from './spreadsheet-grid-state';
import { isFormulaValue, isSpreadsheetErrorValue } from './formula-values';

describe('formula cell values', () => {
  it('keeps formulas as strings during persistence coercion', () => {
    expect(coerceCell('=SUM(B2:B4)')).toBe('=SUM(B2:B4)');
    expect(coerceCell('=B2*2')).toBe('=B2*2');
  });

  it('detects formula values by the leading equals sign', () => {
    expect(isFormulaValue('=SUM(B2:B4)')).toBe(true);
    expect(isFormulaValue('plain')).toBe(false);
    expect(isFormulaValue('a = b')).toBe(false);
    expect(isFormulaValue(null)).toBe(false);
    expect(isFormulaValue(undefined)).toBe(false);
  });

  it('only treats known spreadsheet error codes as errors', () => {
    expect(isSpreadsheetErrorValue('#DIV/0!')).toBe(true);
    expect(isSpreadsheetErrorValue('#CYCLE!')).toBe(true);
    expect(isSpreadsheetErrorValue('#1 seller')).toBe(false);
    expect(isSpreadsheetErrorValue('plain')).toBe(false);
  });
});
