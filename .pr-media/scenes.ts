import { request as apiRequest } from '@playwright/test';
import type { APIRequestContext, Page } from '@playwright/test';
import type { PrMediaScene } from './types';
import { config } from '../src/config';
import { login, markWelcomeVideoSeen } from '../src/clients/api/auth.client';
import { createSuperAdminOrg } from '../src/clients/api/super-admin-orgs.client';
import {
  changeSuperAdminSubscription,
  createSuperAdminSubscription,
  e2eSubscriptionBilling,
} from '../src/clients/api/super-admin-subscriptions.client';
import type {
  ChangeSubscriptionRequestDto,
  CreateSubscriptionRequestDto,
} from '../src/clients/generated/ayunisCoreAPI.schemas';

// The capture fixture authenticates the page as a worker org admin, so the
// super-admin area needs the seeded platform admin's session swapped in.
async function asSuperAdmin(page: Page, label: string) {
  const api = await apiRequest.newContext({ baseURL: config.apiURL });
  await login(api, 'admin@demo.local', 'admin');
  await markWelcomeVideoSeen(api);
  const org = await createSuperAdminOrg(api, `PR media ${label} ${Date.now()}`);
  return { api, orgId: org.id };
}

async function showHistory(
  page: Page,
  api: APIRequestContext,
  orgId: string,
  initial: CreateSubscriptionRequestDto,
  replacement: ChangeSubscriptionRequestDto,
) {
  try {
    await createSuperAdminSubscription(api, orgId, initial);
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

const usageBased = (monthlyCredits: number) => ({
  ...e2eSubscriptionBilling,
  type: 'USAGE_BASED' as const,
  monthlyCredits,
});

export default [
  {
    // Current subscription plus the superseded one it replaced.
    name: 'subscription-history-active',
    path: '/chat',
    viewports: ['desktop', 'mobile'],
    waitFor: async ({ page }) => {
      const { api, orgId } = await asSuperAdmin(page, 'active');
      return showHistory(page, api, orgId, usageBased(500), {
        ...usageBased(1500),
        oldSubscriptionDisposition: 'CANCEL',
      });
    },
  },
  {
    // A not-yet-started subscription stays marked as the current record.
    name: 'subscription-history-scheduled',
    path: '/chat',
    viewports: ['desktop', 'mobile'],
    waitFor: async ({ page }) => {
      const { api, orgId } = await asSuperAdmin(page, 'scheduled');
      return showHistory(page, api, orgId, usageBased(500), {
        ...usageBased(2500),
        startsAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        oldSubscriptionDisposition: 'CANCEL',
      });
    },
  },
  {
    // A cancelled seat-based subscription keeps serving to the end of its paid
    // period, so two records are active at once and the warning is shown.
    name: 'subscription-history-multiple-active',
    path: '/chat',
    viewports: ['desktop', 'mobile'],
    waitFor: async ({ page }) => {
      const { api, orgId } = await asSuperAdmin(page, 'multi-active');
      const history = await showHistory(
        page,
        api,
        orgId,
        { ...e2eSubscriptionBilling, type: 'SEAT_BASED', noOfSeats: 5 },
        { ...usageBased(900), oldSubscriptionDisposition: 'CANCEL' },
      );
      await page
        .getByTestId('subscription-multiple-active-alert')
        .scrollIntoViewIfNeeded();
      return history;
    },
  },
] satisfies PrMediaScene[];
