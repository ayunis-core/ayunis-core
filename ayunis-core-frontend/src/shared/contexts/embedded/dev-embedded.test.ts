import { describe, expect, it } from 'vitest';
import { isDevEmbedded } from '@/shared/contexts/embedded/dev-embedded';

describe('isDevEmbedded', () => {
  it('never puts a production web user into embedded mode, even with ?embedded=1', () => {
    expect(isDevEmbedded(false, '?embedded=1')).toBe(false);
  });

  it('lets a development build preview embedded mode with ?embedded=1', () => {
    expect(isDevEmbedded(true, '?embedded=1')).toBe(true);
    expect(isDevEmbedded(true, '')).toBe(false);
  });
});
