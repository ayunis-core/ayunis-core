import { login, markWelcomeVideoSeen } from '../../src/clients/api/auth.client';
import { createSuperAdminOrg } from '../../src/clients/api/super-admin-orgs.client';
import {
  changeSuperAdminSubscription,
  createSuperAdminSubscription,
  e2eSubscriptionBilling,
  getSuperAdminSubscriptionHistory,
  requestSuperAdminSubscriptionHistory,
} from '../../src/clients/api/super-admin-subscriptions.client';
import { test, expect } from '../../src/fixtures/test';

test.use({ storageState: { cookies: [], origins: [] } });

test('org admin cannot list another organization subscription history', async ({
  api,
  publicApi,
}) => {
  await login(publicApi, 'admin@demo.local', 'admin');
  const org = await createSuperAdminOrg(
    publicApi,
    `History access E2E ${Date.now()}`,
  );

  const denied = await requestSuperAdminSubscriptionHistory(api, org.id);
  expect(denied.status()).toBe(403);

  await createSuperAdminSubscription(publicApi, org.id, {
    ...e2eSubscriptionBilling,
    type: 'USAGE_BASED',
    monthlyCredits: 500,
  });
  const history = await getSuperAdminSubscriptionHistory(publicApi, org.id);
  expect(history.subscriptions).toHaveLength(1);
  expect(history.activeCount).toBe(1);
});

test('super admin sees every subscription after changing with cancel', async ({
  page,
  publicApi,
}) => {
  await login(publicApi, 'admin@demo.local', 'admin');
  await markWelcomeVideoSeen(publicApi);
  await page.context().addCookies((await publicApi.storageState()).cookies);

  const org = await createSuperAdminOrg(
    publicApi,
    `History UI E2E ${Date.now()}`,
  );
  await createSuperAdminSubscription(publicApi, org.id, {
    ...e2eSubscriptionBilling,
    type: 'USAGE_BASED',
    monthlyCredits: 500,
  });

  await page.goto(`/super-admin-settings/orgs/${org.id}?tab=subscriptions`);
  await expect(page.getByTestId('org-subscriptions-tab')).toBeVisible();
  await expect(page.getByTestId('subscription-history')).toHaveCount(0);

  await changeSuperAdminSubscription(publicApi, org.id, {
    ...e2eSubscriptionBilling,
    type: 'USAGE_BASED',
    monthlyCredits: 1500,
    oldSubscriptionDisposition: 'CANCEL',
  });

  await page.goto(`/super-admin-settings/orgs/${org.id}?tab=subscriptions`);
  const history = await getSuperAdminSubscriptionHistory(publicApi, org.id);
  expect(history.subscriptions).toHaveLength(2);
  expect(history.subscriptions[0]?.isLatest).toBe(true);

  await expect(page.getByTestId('subscription-history')).toBeVisible();
  await expect(
    page.getByTestId(`subscription-history-row-${history.subscriptions[0]?.id}`),
  ).toBeVisible();
  await expect(
    page.getByTestId(`subscription-history-row-${history.subscriptions[1]?.id}`),
  ).toBeVisible();
  await expect(page.getByTestId('subscription-history-latest')).toBeVisible();
});
