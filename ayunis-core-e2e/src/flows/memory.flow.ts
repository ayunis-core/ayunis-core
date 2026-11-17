import type { Page } from '@playwright/test';
import { expect } from '../fixtures/test';

/**
 * Opens `url` once the feature toggles and `dataPathname` have loaded, so
 * the absence of something they decide can be asserted.
 */
async function openLoaded(
  page: Page,
  url: string,
  dataPathname: string,
): Promise<void> {
  const responseFor = (pathname: string) =>
    page.waitForResponse(
      (response) => new URL(response.url()).pathname === pathname,
    );
  const loaded = Promise.all([
    responseFor('/api/feature-toggles'),
    responseFor(dataPathname),
  ]);
  await page.goto(url);
  await loaded;
}

/** The user settings, once it is decided whether the memory entry shows. */
export async function openSettings(page: Page, baseUrl = ''): Promise<void> {
  await openLoaded(
    page,
    `${baseUrl}/settings/general`,
    '/api/models/permitted/language-models',
  );
  await expect(page.getByTestId('settings-sidebar')).toBeVisible();
}

/** The organization's model settings, once their switches are decided. */
export async function openModelSettings(
  page: Page,
  baseUrl = '',
): Promise<void> {
  await openLoaded(
    page,
    `${baseUrl}/admin-settings/models`,
    '/api/models/available/language',
  );
}
