import { request as apiRequest } from '@playwright/test';
import {
  getCurrentUser,
  login,
  markWelcomeVideoSeen,
} from '../../src/clients/api/auth.client';
import {
  countSubscriptionAccessAdjustments,
  setSubscriptionAccessEnd,
} from '../../src/clients/database.client';
import { createSuperAdminOrg } from '../../src/clients/api/super-admin-orgs.client';
import {
  changeSuperAdminSubscription,
  createSuperAdminSubscription,
  e2eSubscriptionBilling,
  getSuperAdminSubscriptionHistory,
  requestSuperAdminSubscriptionHistory,
} from '../../src/clients/api/super-admin-subscriptions.client';
import { test, expect } from '../../src/fixtures/test';
import { createOrg } from '../../src/factories/org.factory';
import { config } from '../../src/config';

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
    page.getByTestId(
      `subscription-history-row-${history.subscriptions[0]?.id}`,
    ),
  ).toBeVisible();
  await expect(
    page.getByTestId(
      `subscription-history-row-${history.subscriptions[1]?.id}`,
    ),
  ).toBeVisible();
  await expect(page.getByTestId('subscription-history-latest')).toBeVisible();
});

test('changing a subscription ends the old access period without deleting history', async ({
  page,
  publicApi,
}) => {
  await login(publicApi, 'admin@demo.local', 'admin');
  await markWelcomeVideoSeen(publicApi);
  await page.context().addCookies((await publicApi.storageState()).cookies);

  const org = await createSuperAdminOrg(
    publicApi,
    `History replacement E2E ${Date.now()}`,
  );
  await createSuperAdminSubscription(publicApi, org.id, {
    ...e2eSubscriptionBilling,
    type: 'SEAT_BASED',
    noOfSeats: 5,
  });
  await changeSuperAdminSubscription(publicApi, org.id, {
    ...e2eSubscriptionBilling,
    type: 'USAGE_BASED',
    monthlyCredits: 900,
    oldSubscriptionDisposition: 'CANCEL',
  });

  const history = await getSuperAdminSubscriptionHistory(publicApi, org.id);
  expect(history.activeCount).toBe(1);
  expect(history.subscriptions).toHaveLength(2);
  expect(history.subscriptions[0]?.status).toBe('ACTIVE');
  expect(history.subscriptions[0]?.isLatest).toBe(true);
  expect(history.subscriptions[1]?.status).toBe('HISTORICAL');
  expect(history.subscriptions[1]?.accessEndsAt).toBe(
    history.subscriptions[0]?.startsAt,
  );

  await page.goto(`/super-admin-settings/orgs/${org.id}?tab=subscriptions`);
  await expect(
    page.getByTestId('subscription-multiple-active-alert'),
  ).toHaveCount(0);
  for (const subscription of history.subscriptions) {
    await expect(
      page.getByTestId(`subscription-history-row-${subscription.id}`),
    ).toBeVisible();
  }
  await expect(
    page.getByTestId(
      `subscription-history-status-${history.subscriptions[1]?.id}`,
    ),
  ).toHaveText(/historisch/i);
});

test('org admin sees overlap guidance before a super admin resolves it', async (
  { browser, publicApi },
  testInfo,
) => {
  await login(publicApi, 'admin@demo.local', 'admin');
  await markWelcomeVideoSeen(publicApi);
  const recoveryOrg = await createOrg(
    `overlap-${Date.now()}`,
    testInfo.outputPath('overlap-admin.json'),
  );
  const recoveryApi = await apiRequest.newContext({
    baseURL: config.apiURL,
    storageState: recoveryOrg.storageState,
  });
  const orgId = (await getCurrentUser(recoveryApi)).orgId;
  await recoveryApi.dispose();
  const adminContext = await browser.newContext({
    storageState: recoveryOrg.storageState,
  });
  const adminPage = await adminContext.newPage();
  const seatStartsAt = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const usageStartsAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await createSuperAdminSubscription(publicApi, orgId, {
    ...e2eSubscriptionBilling,
    type: 'SEAT_BASED',
    noOfSeats: 100,
    startsAt: seatStartsAt.toISOString(),
  });
  await changeSuperAdminSubscription(publicApi, orgId, {
    ...e2eSubscriptionBilling,
    type: 'USAGE_BASED',
    monthlyCredits: 900,
    startsAt: usageStartsAt.toISOString(),
    oldSubscriptionDisposition: 'CANCEL',
  });

  const initialHistory = await getSuperAdminSubscriptionHistory(
    publicApi,
    orgId,
  );
  const authoritative = initialHistory.subscriptions.find(
    ({ type }) => type === 'USAGE_BASED',
  );
  const legacy = initialHistory.subscriptions.find(
    ({ type }) => type === 'SEAT_BASED',
  );
  expect(authoritative).toBeDefined();
  expect(legacy).toBeDefined();
  await setSubscriptionAccessEnd(legacy!.id, null);
  expect(
    (await getSuperAdminSubscriptionHistory(publicApi, orgId)).activeCount,
  ).toBe(2);

  const superAdminContext = await browser.newContext({
    storageState: await publicApi.storageState(),
  });
  const superAdminPage = await superAdminContext.newPage();
  const inviteEmail = `overlap-recovery-${Date.now()}@e2e.local`;
  const correctionReason = 'E2E contract transition correction';

  try {
    // The E2E app is self-hosted, so simulate the cloud-only invite guard while
    // exercising the real correction API and successful retry.
    await adminPage.route('**/api/invites', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'MULTIPLE_ACTIVE_SUBSCRIPTIONS',
          message: 'Multiple active subscriptions',
        }),
      });
    });
    await adminPage.goto('/admin-settings/users');
    await adminPage.getByTestId('invite-menu-trigger').click();
    await adminPage.getByTestId('single-invite-menu-item').click();
    await adminPage.getByTestId('invite-create-email').fill(inviteEmail);
    await adminPage.getByTestId('invite-create-role').click();
    await adminPage.getByTestId('invite-create-role-user').click();
    await adminPage.getByTestId('invite-create-submit').click();
    await expect(adminPage.getByRole('region')).toContainText(/überschneiden/i);
    await adminPage.unroute('**/api/invites');

    await superAdminPage.goto(
      `/super-admin-settings/orgs/${orgId}?tab=subscriptions`,
    );
    await superAdminPage
      .getByTestId('resolve-subscription-overlap-trigger')
      .click();
    await superAdminPage
      .getByTestId('subscription-authoritative-select')
      .click();
    await superAdminPage
      .getByTestId(`subscription-authoritative-${authoritative!.id}`)
      .click();
    await superAdminPage
      .getByTestId('subscription-overlap-reason')
      .fill(correctionReason);
    await superAdminPage.getByTestId('subscription-overlap-confirm').click();
    await expect(
      superAdminPage.getByTestId('subscription-multiple-active-alert'),
    ).toHaveCount(0);

    const resolvedHistory = await getSuperAdminSubscriptionHistory(
      publicApi,
      orgId,
    );
    expect(resolvedHistory.activeCount).toBe(1);
    expect(
      resolvedHistory.subscriptions.find(({ id }) => id === legacy!.id)
        ?.accessEndsAt,
    ).toBe(authoritative!.startsAt);
    expect(
      await countSubscriptionAccessAdjustments(legacy!.id, correctionReason),
    ).toBe(1);

    const successfulInvite = adminPage.waitForResponse(
      (response) =>
        response.url().endsWith('/api/invites') &&
        response.request().method() === 'POST' &&
        response.status() === 201,
    );
    await adminPage.getByTestId('invite-create-submit').click();
    await successfulInvite;
    await expect(adminPage.getByTestId('invite-create-submit')).toHaveCount(0);
  } finally {
    await Promise.all([adminContext.close(), superAdminContext.close()]);
  }
});
