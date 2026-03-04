import { describe, it, expect, vi } from 'vitest';

const mockLanguage = { value: 'en' };

vi.mock('@/i18n', () => ({
  default: {
    get language() {
      return mockLanguage.value;
    },
  },
}));

import { getHelpCenterUrl } from './help-center';

describe('getHelpCenterUrl', () => {
  it('returns English URL when language is en', () => {
    mockLanguage.value = 'en';
    expect(getHelpCenterUrl('skills/')).toBe(
      'https://docs.ayunis.com/en/skills/',
    );
  });

  it('returns German URL when language is de', () => {
    mockLanguage.value = 'de';
    expect(getHelpCenterUrl('skills/')).toBe(
      'https://docs.ayunis.com/de/skills/',
    );
  });

  it('defaults to de for unknown languages', () => {
    mockLanguage.value = 'fr';
    expect(getHelpCenterUrl('skills/')).toBe(
      'https://docs.ayunis.com/de/skills/',
    );
  });
});
