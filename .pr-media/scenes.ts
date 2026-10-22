import type { PrMediaScene } from './types';
import { login, markWelcomeVideoSeen } from '../src/clients/api/auth.client';
import { createSuperAdminOrg } from '../src/clients/api/super-admin-orgs.client';

export default [{
  name: 'subscription-optional-end',
  path: '/super-admin-settings/orgs',
  viewports: ['desktop'],
  waitFor: async ({ page }) => {
    await login(page.request, 'admin@demo.local', 'admin');
    await markWelcomeVideoSeen(page.request);
    const org = await createSuperAdminOrg(page.request, `Subscription end review ${Date.now()}`);
    await page.addInitScript(() => localStorage.setItem('ayunis-language', 'en'));
    await page.goto(`/super-admin-settings/orgs/${org.id}?tab=subscriptions`);
    await page.getByRole('button', { name: 'Create Subscription', exact: true }).click();
    await page.getByTestId('subscription-end-date-picker').scrollIntoViewIfNeeded();
    return page.getByTestId('subscription-end-date-picker');
  },
}] satisfies PrMediaScene[];
