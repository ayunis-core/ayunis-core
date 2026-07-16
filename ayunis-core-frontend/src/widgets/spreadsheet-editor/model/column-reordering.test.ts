import { describe, expect, it } from 'vitest';
import { getColumnDragId, resolveColumnReorder } from './column-reordering';

describe('resolveColumnReorder', () => {
  it('maps drag ids back to column indices', () => {
    expect(
      resolveColumnReorder(getColumnDragId(1), getColumnDragId(0)),
    ).toEqual({ from: 1, to: 0 });
    expect(
      resolveColumnReorder(getColumnDragId(0), getColumnDragId(2)),
    ).toEqual({ from: 0, to: 2 });
  });

  it('returns null when dropped on itself or outside the list', () => {
    expect(resolveColumnReorder(getColumnDragId(1), getColumnDragId(1))).toBe(
      null,
    );
    expect(resolveColumnReorder(getColumnDragId(1), undefined)).toBe(null);
  });

  it('returns null for malformed ids', () => {
    expect(resolveColumnReorder('column-x', getColumnDragId(1))).toBe(null);
  });
});
