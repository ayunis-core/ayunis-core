import { login } from '../../src/clients/api/auth.client';
import { createSuperAdminOrg } from '../../src/clients/api/super-admin-orgs.client';
import {
  cancelSuperAdminSubscription,
  createSuperAdminSubscription,
  e2eSubscriptionBilling,
  getSuperAdminSubscriptionHistory,
  updateSuperAdminMonthlyCredits,
} from '../../src/clients/api/super-admin-subscriptions.client';
import { test, expect } from '../../src/fixtures/test';

test.use({ storageState: { cookies: [], origins: [] } });

test('super admin can edit and cancel a subscription that has not started', async ({
  publicApi,
}) => {
  await login(publicApi, 'admin@demo.local', 'admin');
  const org = await createSuperAdminOrg(
    publicApi,
    `Scheduled subscription E2E ${Date.now()}`,
  );
  const startsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await createSuperAdminSubscription(publicApi, org.id, {
    ...e2eSubscriptionBilling,
    type: 'USAGE_BASED',
    monthlyCredits: 500,
    startsAt: startsAt.toISOString(),
  });

  const scheduled = await getSuperAdminSubscriptionHistory(publicApi, org.id);
  expect(scheduled.subscriptions[0]?.status).toBe('SCHEDULED');

  // Both of these resolved the *active* subscription before AYC-995 and so
  // returned 404 for a subscription whose start date is still in the future.
  await updateSuperAdminMonthlyCredits(publicApi, org.id, {
    monthlyCredits: 7777,
  });
  await cancelSuperAdminSubscription(publicApi, org.id);

  const after = await getSuperAdminSubscriptionHistory(publicApi, org.id);
  expect(after.subscriptions).toHaveLength(1);
  expect(after.subscriptions[0]?.monthlyCredits).toBe(7777);
  expect(after.subscriptions[0]?.cancelledAt).toBeTruthy();
  expect(after.activeCount).toBe(0);
});
