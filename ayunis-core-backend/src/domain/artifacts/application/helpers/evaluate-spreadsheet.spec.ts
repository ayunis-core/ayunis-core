import { SpreadsheetEvaluator } from './evaluate-spreadsheet';
import type { SpreadsheetData } from './spreadsheet-content';

function evaluate(data: SpreadsheetData) {
  return new SpreadsheetEvaluator(data).evaluate();
}

describe('SpreadsheetEvaluator', () => {
  it('passes plain cells through unchanged', () => {
    const result = evaluate({
      columns: ['Item', 'Amount'],
      rows: [
        ['Rent', 1200],
        ['007', null],
      ],
    });

    expect(result).toEqual([
      ['Rent', 1200],
      ['007', null],
    ]);
  });

  it('evaluates aggregate formulas over typed numbers', () => {
    const result = evaluate({
      columns: ['Item', 'Amount'],
      rows: [
        ['Rent', 1200],
        ['Food', 450.5],
        ['Total', '=SUM(B2:B3)'],
      ],
    });

    expect(result[2][1]).toBe(1650.5);
  });

  it('lets formulas reference other formula cells', () => {
    const result = evaluate({
      columns: ['A', 'B'],
      rows: [
        [10, '=A2*2'],
        [null, '=B2+1'],
      ],
    });

    expect(result[0][1]).toBe(20);
    expect(result[1][1]).toBe(21);
  });

  it('returns error codes for invalid formulas', () => {
    const result = evaluate({
      columns: ['A', 'B', 'C'],
      rows: [[1, '=A2/0', '=NOSUCHFN(1)']],
    });

    expect(result[0][1]).toBe('#DIV/0!');
    expect(result[0][2]).toMatch(/^#/);
  });

  it('detects reference cycles instead of hanging', () => {
    const result = evaluate({
      columns: ['A', 'B'],
      rows: [['=B2', '=A2']],
    });

    expect(result[0][0]).toBe('#CYCLE!');
  });

  it('reads header labels from row 1', () => {
    const result = evaluate({
      columns: ['Item', 'Amount'],
      rows: [['=A1', null]],
    });

    expect(result[0][0]).toBe('Item');
  });
});
