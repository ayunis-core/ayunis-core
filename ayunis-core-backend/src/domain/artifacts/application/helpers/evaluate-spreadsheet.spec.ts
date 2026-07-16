import { SpreadsheetEvaluator } from './evaluate-spreadsheet';
import type { SpreadsheetGrid } from './spreadsheet-content-format';

function evaluate(data: SpreadsheetGrid) {
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

  it('coerces numeric strings like the UI engine before evaluating', () => {
    const result = evaluate({
      columns: ['Item', 'Amount'],
      rows: [
        ['Rent', '1200'],
        ['Food', '450.5'],
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

  it('stops evaluation when the referenced-cell budget is exceeded', () => {
    const evaluator = new SpreadsheetEvaluator(
      {
        columns: ['Amount', 'Total'],
        rows: [
          [10, '=SUM(A2:A3)'],
          [20, null],
        ],
      },
      undefined,
      {
        maxFormulaCells: 10,
        maxReferencedCells: 1,
        maxOperations: 10,
      },
    );

    expect(() => evaluator.evaluateForExport()).toThrow(
      'Spreadsheet evaluation budget exceeded',
    );
  });

  it('reads header labels from row 1', () => {
    const result = evaluate({
      columns: ['Item', 'Amount'],
      rows: [['=A1', null]],
    });

    expect(result[0][0]).toBe('Item');
  });

  it('evaluates reverse ranges and clamps full-column ranges to the sheet', () => {
    const result = evaluate({
      columns: ['A', 'B', 'C'],
      rows: [
        ['1', '2', null],
        ['=SUM(B1:B5)', null, '=SUM(B2:A2)'],
      ],
    });

    expect(result[1][0]).toBe(2);
    expect(result[1][2]).toBe(3);
  });

  it('preserves hash-prefixed text returned by formulas', () => {
    const result = evaluate({
      columns: ['A', 'B'],
      rows: [['="#1 seller"', '=A2&""']],
    });

    expect(result[0][0]).toBe('#1 seller');
    expect(result[0][1]).toBe('#1 seller');
  });

  it('normalizes floating-point noise in final formula results', () => {
    const result = evaluate({
      columns: ['A', 'B', 'C'],
      rows: [['0.1', '0.2', '=A2+B2']],
    });

    expect(result[0][2]).toBe(0.3);
  });

  describe('evaluateForExport', () => {
    it('marks successfully evaluated local formulas as live formulas', () => {
      const result = new SpreadsheetEvaluator({
        columns: ['Amount', 'Total'],
        rows: [[10, '=SUM(A2:A2)']],
      }).evaluateForExport();

      expect(result.values[0][1]).toBe(10);
      expect(result.liveFormulaCells[0][1]).toBe(true);
    });

    it('does not mark unsupported or cross-sheet formulas as live formulas', () => {
      const result = new SpreadsheetEvaluator({
        columns: ['Value', 'Unsupported', 'External'],
        rows: [
          [
            10,
            '=HYPERLINK("https://example.com","Open")',
            '=SUM(OtherSheet!A1:A2)',
          ],
        ],
      }).evaluateForExport();

      expect(result.liveFormulaCells[0][1]).toBe(false);
      expect(result.liveFormulaCells[0][2]).toBe(false);
      expect(result.values[0][2]).toBe('#REF!');
    });

    it('does not evaluate formula-like text from a plain text source cell', () => {
      const result = new SpreadsheetEvaluator(
        {
          columns: ['Note'],
          rows: [['=SUM(9,9)']],
        },
        [[false]],
      ).evaluateForExport();

      expect(result.values[0][0]).toBe('=SUM(9,9)');
      expect(result.liveFormulaCells[0][0]).toBe(false);
    });
  });
});
