import { describe, expect, it } from 'vitest';
import { computeDisplayValues } from './formula-engine';
import type { GridState } from './spreadsheet-content';

function grid(columns: string[], rows: (string | null)[][]): GridState {
  return {
    columns,
    rows: rows.map((cells) =>
      Object.fromEntries(cells.map((cell, i) => [`c${i}`, cell])),
    ),
  };
}

describe('computeDisplayValues', () => {
  it('shows plain cells as their raw text', () => {
    const display = computeDisplayValues(
      grid(
        ['Item', 'Amount'],
        [
          ['Rent', '1200'],
          ['007', null],
        ],
      ),
    );

    expect(display).toEqual([
      ['Rent', '1200'],
      ['007', ''],
    ]);
  });

  it('evaluates SUM over a range', () => {
    const display = computeDisplayValues(
      grid(
        ['Item', 'Amount'],
        [
          ['Rent', '1200'],
          ['Food', '450.5'],
          ['Total', '=SUM(B2:B3)'],
        ],
      ),
    );

    expect(display[2][1]).toBe('1650.5');
  });

  it('evaluates arithmetic and nested functions', () => {
    const display = computeDisplayValues(
      grid(
        ['A', 'B', 'C'],
        [
          ['10', '4', '=A2*B2'],
          ['x', 'y', '=ROUND(AVERAGE(A2:B2), 1)'],
        ],
      ),
    );

    expect(display[0][2]).toBe('40');
    expect(display[1][2]).toBe('7');
  });

  it('lets formulas reference other formula cells', () => {
    const display = computeDisplayValues(
      grid(
        ['A', 'B'],
        [
          ['10', '=A2*2'],
          ['x', '=B2+1'],
        ],
      ),
    );

    expect(display[0][1]).toBe('20');
    expect(display[1][1]).toBe('21');
  });

  it('reads header labels from row 1', () => {
    const display = computeDisplayValues(
      grid(['Item', 'Amount'], [['x', '=A1']]),
    );

    expect(display[0][1]).toBe('Item');
  });

  it('reports division by zero', () => {
    const display = computeDisplayValues(grid(['A'], [['=1/0']]));

    expect(display[0][0]).toBe('#DIV/0!');
  });

  it('reports unknown functions as errors', () => {
    const display = computeDisplayValues(grid(['A'], [['=NOSUCHFN(1)']]));

    expect(display[0][0]).toMatch(/^#/);
  });

  it('reports broken references from column deletion', () => {
    const display = computeDisplayValues(grid(['A'], [['=SUM(#REF!)']]));

    expect(display[0][0]).toMatch(/^#/);
  });

  it('detects direct and indirect reference cycles', () => {
    const direct = computeDisplayValues(grid(['A'], [['=A2']]));
    expect(direct[0][0]).toBe('#CYCLE!');

    const indirect = computeDisplayValues(grid(['A', 'B'], [['=B2', '=A2']]));
    expect(indirect[0][0]).toBe('#CYCLE!');
  });

  it('treats empty referenced cells as zero in sums', () => {
    const display = computeDisplayValues(
      grid(
        ['A', 'B'],
        [
          ['5', null],
          ['=SUM(A2:B2)', 'x'],
        ],
      ),
    );

    expect(display[1][0]).toBe('5');
  });

  it('coerces numeric-looking strings in referenced cells', () => {
    const display = computeDisplayValues(grid(['A', 'B'], [['12', '=A2*2']]));

    expect(display[0][1]).toBe('24');
  });

  it('avoids binary float display noise', () => {
    const display = computeDisplayValues(
      grid(['A', 'B', 'C'], [['0.1', '0.2', '=A2+B2']]),
    );

    expect(display[0][2]).toBe('0.3');
  });
});
