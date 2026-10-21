import { describe, expect, it } from 'vitest';
import {
  AUTO_FIT_MAX_WIDTH,
  AUTO_FIT_MIN_WIDTH,
  fitColumnWidth,
} from './column-auto-fit';

describe('fitColumnWidth', () => {
  it('fits the widest cell plus padding', () => {
    expect(fitColumnWidth(50, [30, 100.2, 0], 16)).toBe(117);
  });

  it('keeps the header width when it is wider than every cell', () => {
    expect(fitColumnWidth(150, [30], 16)).toBe(150);
  });

  it('caps very long content at the auto-fit maximum', () => {
    expect(fitColumnWidth(50, [2000], 16)).toBe(AUTO_FIT_MAX_WIDTH);
  });

  it('never shrinks below the minimum column width', () => {
    expect(fitColumnWidth(5, [], 0)).toBe(AUTO_FIT_MIN_WIDTH);
  });
});
