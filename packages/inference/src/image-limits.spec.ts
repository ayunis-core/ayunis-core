import { describe, expect, it } from 'vitest';

import { rawBytesWithinBase64 } from './image-limits';

describe('rawBytesWithinBase64', () => {
  it('returns the raw size whose base64 encoding still fits the ceiling', () => {
    const raw = rawBytesWithinBase64(5 * 1024 * 1024);

    expect(raw).toBe(3_932_160);
    expect(Buffer.alloc(raw).toString('base64')).toHaveLength(5 * 1024 * 1024);
    expect(Buffer.alloc(raw + 1).toString('base64').length).toBeGreaterThan(
      5 * 1024 * 1024,
    );
  });

  it('rounds a ceiling that is not a multiple of four down to whole base64 groups', () => {
    expect(rawBytesWithinBase64(10)).toBe(6);
    expect(Buffer.alloc(6).toString('base64')).toHaveLength(8);
    expect(Buffer.alloc(7).toString('base64')).toHaveLength(12);
  });
});
