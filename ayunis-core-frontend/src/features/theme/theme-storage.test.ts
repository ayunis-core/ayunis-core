import { afterEach, describe, expect, it, vi } from 'vitest';
import { getTheme } from './getTheme';
import { setTheme } from './setTheme';

// Browsers that block third-party storage throw on every access inside the
// Outlook pane's iframe; the root route reads the theme before anything shows.
describe('theme without storage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('falls back to light and still applies the theme when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });

    expect(getTheme()).toBe('light');
    expect(() => setTheme('dark')).not.toThrow();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
