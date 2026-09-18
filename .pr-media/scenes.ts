import { request as apiRequest } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { PrMediaScene } from './types';
import { config } from '../src/config';
import { login, markWelcomeVideoSeen } from '../src/clients/api/auth.client';
import { createSuperAdminOrg } from '../src/clients/api/super-admin-orgs.client';
import {
  changeSuperAdminSubscription,
  createSuperAdminSubscription,
  e2eSubscriptionBilling,
} from '../src/clients/api/super-admin-subscriptions.client';
import type { ChangeSubscriptionRequestDto } from '../src/clients/generated/ayunisCoreAPI.schemas';

// The capture fixture authenticates the page as a worker org admin, so the
// super-admin area needs the seeded platform admin's session swapped in.
async function showHistoryAs(
  page: Page,
  replacement: ChangeSubscriptionRequestDto,
) {
  const api = await apiRequest.newContext({ baseURL: config.apiURL });
  let orgId: string;
  try {
    await login(api, 'admin@demo.local', 'admin');
    await markWelcomeVideoSeen(api);
    const org = await createSuperAdminOrg(
      api,
      `PR media subscription history ${Date.now()}`,
    );
    orgId = org.id;
    await createSuperAdminSubscription(api, orgId, {
      ...e2eSubscriptionBilling,
      type: 'USAGE_BASED',
      monthlyCredits: 500,
    });
    await changeSuperAdminSubscription(api, orgId, replacement);
    await page.context().clearCookies();
    await page.context().addCookies((await api.storageState()).cookies);
  } finally {
    await api.dispose();
  }

  await page.goto(`/super-admin-settings/orgs/${orgId}?tab=subscriptions`);
  const history = page.getByTestId('subscription-history');
  await history.scrollIntoViewIfNeeded();
  return history;
}

function futureStartDate(): string {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
}

export default [
  {
    // Current subscription plus the superseded one it replaced.
    name: 'subscription-history-active',
    path: '/chat',
    viewports: ['desktop', 'mobile'],
    waitFor: ({ page }) =>
      showHistoryAs(page, {
        ...e2eSubscriptionBilling,
        type: 'USAGE_BASED',
        monthlyCredits: 1500,
        oldSubscriptionDisposition: 'CANCEL',
      }),
  },
  {
    // A not-yet-started subscription stays marked as the current record.
    name: 'subscription-history-scheduled',
    path: '/chat',
    viewports: ['desktop', 'mobile'],
    waitFor: ({ page }) =>
      showHistoryAs(page, {
        ...e2eSubscriptionBilling,
        type: 'USAGE_BASED',
        monthlyCredits: 2500,
        startsAt: futureStartDate(),
        oldSubscriptionDisposition: 'CANCEL',
      }),
  },
] satisfies PrMediaScene[];
