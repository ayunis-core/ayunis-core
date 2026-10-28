import { describe, expect, it } from 'vitest';
import { applyPendingOrder } from './applyPendingOrder';

const a = { id: 'a' };
const b = { id: 'b' };
const c = { id: 'c' };

describe('applyPendingOrder', () => {
  it('orders the items as the pending ids say', () => {
    expect(applyPendingOrder([a, b, c], ['c', 'a', 'b'])).toEqual([c, a, b]);
  });

  it('appends items the pending order does not mention', () => {
    expect(applyPendingOrder([a, b, c], ['c'])).toEqual([c, a, b]);
  });

  it('skips ids that no longer exist instead of rendering a hole', () => {
    expect(applyPendingOrder([a, b], ['c', 'b', 'a'])).toEqual([b, a]);
  });

  it('never duplicates an item', () => {
    const result = applyPendingOrder([a, b], ['a', 'a', 'b']);
    expect(result).toEqual([a, b]);
  });

  it('returns the items unchanged for an empty pending order', () => {
    expect(applyPendingOrder([a, b], [])).toEqual([a, b]);
  });
});
