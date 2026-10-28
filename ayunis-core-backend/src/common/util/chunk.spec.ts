import { chunk } from './chunk';

describe('chunk', () => {
  it('returns no chunks for an empty list', () => {
    expect(chunk([], 3)).toEqual([]);
  });

  it('splits into full chunks plus a shorter remainder', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('keeps a list shorter than the chunk size whole', () => {
    expect(chunk(['a', 'b'], 5)).toEqual([['a', 'b']]);
  });
});
