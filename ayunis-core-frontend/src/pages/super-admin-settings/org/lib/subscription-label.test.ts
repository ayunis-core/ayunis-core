import { createInstance } from 'i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import en from '@/shared/locales/en/super-admin-settings-org.json';
import de from '@/shared/locales/de/super-admin-settings-org.json';
import { subscriptionLabel } from './subscription-label';

beforeEach(() =>
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-23T12:00:00Z')),
);
afterEach(() => vi.restoreAllMocks());

describe('subscriptionLabel', () => {
  it.each([
    ['en', '2026-07-06T00:00:00Z', 'Usage-based, started '],
    ['en', '2026-10-23T12:00:00Z', 'Usage-based, started '],
    ['en', '2026-11-20T00:00:00Z', 'Usage-based, starts '],
    ['de', '2026-07-06T00:00:00Z', 'Nutzungsbasiert, gestartet am '],
    ['de', '2026-10-23T12:00:00Z', 'Nutzungsbasiert, gestartet am '],
    ['de', '2026-11-20T00:00:00Z', 'Nutzungsbasiert, startet am '],
  ])(
    'uses the correct tense in %s for %s',
    async (language, startsAt, prefix) => {
      const i18n = createInstance();
      await i18n.init({
        lng: language,
        interpolation: { escapeValue: false },
        resources: {
          en: { 'super-admin-settings-org': en },
          de: { 'super-admin-settings-org': de },
        },
      });
      const subscription = {
        id: 'subscription',
        type: 'USAGE_BASED' as const,
        status: 'ACTIVE' as const,
        isLatest: true,
        createdAt: startsAt,
        startsAt,
        accessEndsAt: null,
      };
      expect(
        subscriptionLabel(
          subscription,
          i18n.getFixedT(language, 'super-admin-settings-org'),
        ),
      ).toBe(prefix + new Date(startsAt).toLocaleDateString());
    },
  );
});
