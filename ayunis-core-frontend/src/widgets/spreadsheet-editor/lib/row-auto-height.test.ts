import { describe, expect, it } from 'vitest';
import {
  computeRowDefinitions,
  countWrappedLines,
  type RowHeightMetrics,
} from './row-auto-height';

// Every character is 10px wide, so a 100px line holds ten characters.
const measure = (text: string) => text.length * 10;

const metrics: RowHeightMetrics = {
  measureText: measure,
  measureFormula: measure,
  lineHeight: 20,
  horizontalPadding: 10,
  verticalPadding: 12,
};

describe('countWrappedLines', () => {
  it('keeps text that fits on a single line', () => {
    expect(countWrappedLines('short text', 100, measure)).toBe(1);
  });

  it('wraps at word boundaries instead of clipping the overflow', () => {
    expect(countWrappedLines('aaaa bbbb cccc dddd', 100, measure)).toBe(2);
  });

  it('breaks a word longer than the line across several lines', () => {
    expect(countWrappedLines('x'.repeat(25), 100, measure)).toBe(3);
  });

  it('starts a new line for every line break in the value', () => {
    expect(countWrappedLines('one\n\nthree', 100, measure)).toBe(3);
  });
});

describe('computeRowDefinitions', () => {
  it('grows a row to fit its tallest cell and leaves short rows untouched', () => {
    const rows = [
      { c0: 'short', c1: 'aaaa bbbb cccc dddd eeee' },
      { c0: 'short', c1: null },
    ];

    expect(computeRowDefinitions(rows, [[], []], [110, 110], metrics)).toEqual([
      { type: 'rgRow', index: 0, size: 3 * 20 + 12 },
    ]);
  });

  it('shrinks a row again when its column gets wider', () => {
    const rows = [{ c0: 'aaaa bbbb cccc dddd' }];

    expect(computeRowDefinitions(rows, [[]], [110], metrics)).toHaveLength(1);
    expect(computeRowDefinitions(rows, [[]], [300], metrics)).toEqual([]);
  });

  it('wraps the computed value of a formula cell, not the formula', () => {
    const rows = [{ c0: '=A1' }];
    const displayValues = [['aaaa bbbb cccc dddd']];

    expect(computeRowDefinitions(rows, displayValues, [110], metrics)).toEqual([
      { type: 'rgRow', index: 0, size: 2 * 20 + 12 },
    ]);
  });
});
