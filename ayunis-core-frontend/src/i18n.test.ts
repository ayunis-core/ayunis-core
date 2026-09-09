import { describe, it, expect, afterAll } from 'vitest';
import * as z from 'zod';
import i18n from './i18n';

// Validators without an explicit message fall back to zod's built-in copy.
// i18n.ts configures zod's locale so those defaults follow the active
// language; without that wiring they surface in English in a German UI.
const maxMessage = () =>
  z.string().max(2).safeParse('abc').error?.issues[0]?.message ?? '';

describe('zod locale follows the active language', () => {
  afterAll(async () => {
    await i18n.changeLanguage('de');
  });

  // Deliberately does not switch the language first: this asserts the locale
  // is already configured once i18n.ts has loaded.
  it('is configured for the fallback language on load', () => {
    expect(maxMessage()).toBe('Zu groß: erwartet, dass string <=2 Zeichen hat');
  });

  it('switches the defaults when the language changes', async () => {
    await i18n.changeLanguage('en');
    expect(maxMessage()).toBe(
      'Too big: expected string to have <=2 characters',
    );
  });
});
