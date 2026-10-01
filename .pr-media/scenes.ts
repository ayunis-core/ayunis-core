import { loginThroughUi } from '../src/flows/auth.flow';
import type { PrMediaScene } from './types';

export default [
  {
    name: 'organisation-status-filter',
    path: '/super-admin-settings/orgs',
    viewports: ['desktop', 'mobile'],
    waitFor: async ({page}) => {
      await page.context().clearCookies();
      await loginThroughUi(page, 'admin@demo.local', 'admin');
      await page.goto('/super-admin-settings/orgs');
      await page.getByTestId('org-status-filter').waitFor({state:'visible'});
      await page.getByTestId('org-status-filter').click();
      await page.getByTestId('org-filter-all').click();
    },
  },
  {
    name: 'organisation-lifecycle',
    path: '/super-admin-settings/orgs',
    viewports: ['desktop', 'mobile'],
    waitFor: async ({page}) => {
      await page.context().clearCookies();
      await loginThroughUi(page, 'admin@demo.local', 'admin');
      await page.goto('/super-admin-settings/orgs');
      await page.locator('[data-testid^="org-row-"]').first().click();
      await page.getByTestId('org-archive-toggle').waitFor({state:'visible'});
    },
    demos: [{
      name: 'irreversible-delete-confirmation',
      action: async ({page}) => {
        await page.getByTestId('org-delete-open').click();
        await page.getByTestId('org-delete-name').waitFor({state:'visible'});
      },
    }],
  },
] satisfies PrMediaScene[];
