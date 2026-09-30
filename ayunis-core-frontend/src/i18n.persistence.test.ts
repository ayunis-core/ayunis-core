import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('language preference restoration', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  it('restores the saved language on the next page load', async () => {
    window.localStorage.setItem('ayunis-language', 'en');

    const { default: reloadedI18n } = await import('./i18n');

    expect(reloadedI18n.language).toBe('en');
  });

  it('uses German when no language has been saved', async () => {
    const { default: reloadedI18n } = await import('./i18n');

    expect(reloadedI18n.language).toBe('de');
  });

  it('uses German when the saved language is unsupported', async () => {
    window.localStorage.setItem('ayunis-language', 'fr');

    const { default: reloadedI18n } = await import('./i18n');

    expect(reloadedI18n.language).toBe('de');
  });
});
