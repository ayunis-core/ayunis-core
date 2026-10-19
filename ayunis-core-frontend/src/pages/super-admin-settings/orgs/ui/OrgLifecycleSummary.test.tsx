import { cleanup, render, screen } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it } from 'vitest';
import de from '@/shared/locales/de/super-admin-settings-orgs.json';
import en from '@/shared/locales/en/super-admin-settings-orgs.json';
import type { OrgLifecycleCountsDto } from '@/shared/api';
import OrgLifecycleSummary from './OrgLifecycleSummary';

const NS = 'super-admin-settings-orgs';

async function renderSummary(
  language: 'de' | 'en',
  counts: OrgLifecycleCountsDto,
) {
  const i18n = createInstance();
  await i18n.init({
    lng: language,
    resources: { de: { [NS]: de }, en: { [NS]: en } },
    defaultNS: NS,
  });
  render(
    <I18nextProvider i18n={i18n}>
      <OrgLifecycleSummary counts={counts} />
    </I18nextProvider>,
  );
  return screen.getByTestId('org-lifecycle-summary').textContent;
}

describe('OrgLifecycleSummary', () => {
  afterEach(cleanup);

  it('summarises every status in German', async () => {
    expect(
      await renderSummary('de', {
        total: 56,
        paying: 14,
        expired: 1,
        trial: 36,
        'no-plan': 4,
        archived: 1,
      }),
    ).toBe(
      '56 Organisationen · 14 zahlend · 1 abgelaufen · 36 in der Testphase · 4 ohne Tarif · 1 archiviert',
    );
  });

  it('summarises every status in English', async () => {
    expect(
      await renderSummary('en', {
        total: 56,
        paying: 14,
        expired: 1,
        trial: 36,
        'no-plan': 4,
        archived: 1,
      }),
    ).toBe(
      '56 organisations · 14 paying · 1 expired · 36 on trial · 4 with no plan · 1 archived',
    );
  });

  it('uses the singular for one organisation and keeps zero counts', async () => {
    expect(
      await renderSummary('de', {
        total: 1,
        paying: 1,
        expired: 0,
        trial: 0,
        'no-plan': 0,
        archived: 0,
      }),
    ).toBe(
      '1 Organisation · 1 zahlend · 0 abgelaufen · 0 in der Testphase · 0 ohne Tarif · 0 archiviert',
    );
  });

  it('formats large numbers for the locale', async () => {
    const counts = {
      total: 1234,
      paying: 1234,
      expired: 0,
      trial: 0,
      'no-plan': 0,
      archived: 0,
    };
    expect(await renderSummary('de', counts)).toMatch(
      /^1\.234 Organisationen · 1\.234 zahlend/,
    );
    cleanup();
    expect(await renderSummary('en', counts)).toMatch(
      /^1,234 organisations · 1,234 paying/,
    );
  });
});
