import { describe, expect, it } from 'vitest';
import { paginateItems } from './paginate-items';

const items = Array.from({ length: 25 }, (_, i) => i);

describe('paginateItems', () => {
  it('returns the requested page slice', () => {
    expect(paginateItems(items, 2, 10)).toEqual({
      pageItems: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
      currentPage: 2,
      totalPages: 3,
    });
  });

  it('clamps a page beyond the end to the last page', () => {
    const result = paginateItems(items, 9, 10);
    expect(result.currentPage).toBe(3);
    expect(result.pageItems).toEqual([20, 21, 22, 23, 24]);
  });

  it('reports a single page for an empty list', () => {
    expect(paginateItems([], 1, 10)).toEqual({
      pageItems: [],
      currentPage: 1,
      totalPages: 1,
    });
  });
});
