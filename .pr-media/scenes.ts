import { randomUUID } from 'node:crypto';
import { config } from '../src/config';
import type { PrMediaScene } from './types';

export default [
  {
    name: 'active-sso-domain-maintenance',
    path: '/login',
    viewports: ['desktop', 'mobile'],
    waitFor: async ({ page, expect }) => {
      const key = randomUUID();
      const orgName = `PR 1577 media ${key}`;
      const domain = `stadt-${key}.example`;
      const registration = await page.request.post(`${config.apiURL}/api/auth/register`, {
        data: { email: `admin@${domain}`, password: `Review-${key}-Aa1`, orgName, userName: 'Review admin' },
      });
      expect(registration.ok()).toBeTruthy();
      const login = await page.request.post(`${config.apiURL}/api/auth/login`, {
        data: { email: 'admin@demo.local', password: 'admin' },
      });
      expect(login.ok()).toBeTruthy();
      const organizations = await page.request.get(`${config.apiURL}/api/super-admin/orgs`, {
        params: { search: orgName, limit: '5' },
      });
      expect(organizations.ok()).toBeTruthy();
      const { data } = await organizations.json() as { data: Array<{ id: string; name: string }> };
      const org = data.find((entry) => entry.name === orgName);
      if (!org) throw new Error('Media organization not found');
      await page.goto(`/super-admin-settings/orgs/${org.id}?tab=sso`);
      await page.getByTestId('sso-email-domain-0').fill(domain);
      await page.getByTestId('sso-zitadel-org-id').fill(`broker-${key}`);
      await page.getByTestId('sso-zitadel-idp-id').fill(`idp-${key}`);
      await page.getByTestId('sso-domain-verified').click();
      await page.getByTestId('sso-connection-save').click();
      await page.getByTestId('sso-enable').click();
      await page.getByTestId('sso-enable-reviewed').click();
      await page.getByTestId('sso-enable-confirm').click();
      await expect(page.getByTestId('sso-email-domain-0')).toBeDisabled();
      await page.getByTestId('sso-required').click();
      await page.getByTestId('sso-required-reviewed').click();
      await page.getByTestId('sso-required-confirm').click();
      await expect(page.getByTestId('sso-required')).toBeChecked();
      await expect(page.getByTestId('sso-zitadel-idp-id')).toBeDisabled();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await page.reload();
      await expect(page.getByTestId('sso-required')).toBeChecked();
      await page.getByTestId('sso-email-domain-0').scrollIntoViewIfNeeded();
      await expect.poll(() => page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )).toBeLessThanOrEqual(1);
      return page.getByTestId('sso-add-email-domain');
    },
    demos: [
      {
        name: 'add-verified-domain',
        action: async ({ page, expect }) => {
          await page.getByTestId('sso-add-email-domain').click();
          await page.getByTestId('sso-email-domain-1').fill(`new-${randomUUID()}.example`);
          await expect(page.getByTestId('sso-email-domain-0')).toBeDisabled();
          await expect(page.getByTestId('sso-connection-save')).toBeDisabled();
          await page.getByTestId('sso-domain-verified').click();
          await page.getByTestId('sso-connection-save').click();
          await expect(page.getByTestId('sso-email-domain-1')).toBeDisabled();
          await expect(page.getByTestId('sso-required')).toBeChecked();
        },
      },
    ],
  },
] satisfies PrMediaScene[];
