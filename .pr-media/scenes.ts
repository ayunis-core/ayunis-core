import { request, type Page } from '@playwright/test';
import { login, markWelcomeVideoSeen } from '../src/clients/api/auth.client';
import { config } from '../src/config';
import type { PrMediaScene } from './types';

async function openSuperAdminOrgs(page: Page) {
  const api = await request.newContext({baseURL: config.apiURL});
  try {
    await login(api, 'admin@demo.local', 'admin');
    await markWelcomeVideoSeen(api);
    await page.context().clearCookies();
    await page.context().addCookies((await api.storageState()).cookies);
  } finally { await api.dispose(); }
  await page.goto('/super-admin-settings/orgs');
}

export default [
  {
    name: 'organisation-status-filter', path: '/super-admin-settings/orgs',
    viewports: ['desktop', 'mobile'],
    waitFor: async ({page}) => {
      await openSuperAdminOrgs(page);
      await page.getByTestId('org-status-filter').click();
      await page.getByTestId('org-filter-all').click();
    },
  },
  {
    name: 'organisation-lifecycle', path: '/super-admin-settings/orgs',
    viewports: ['desktop', 'mobile'],
    waitFor: async ({page}) => {
      await openSuperAdminOrgs(page);
      await page.locator('[data-testid^="org-row-"]').first().click();
      await page.getByTestId('org-archive-toggle').waitFor({state:'visible'});
    },
    demos: [{name: 'irreversible-delete-confirmation', action: async ({page}) => {
      await page.getByTestId('org-delete-open').click();
      await page.getByTestId('org-delete-name').waitFor({state:'visible'});
    }}],
  },
] satisfies PrMediaScene[];
