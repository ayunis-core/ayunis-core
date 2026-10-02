import type { Page, Route } from '@playwright/test';
import type { PrMediaScene } from './types';
import { config } from '../src/config';

const billingInfo = {
  companyName: 'Beispiel Kommune',
  street: 'Rathausplatz',
  houseNumber: '1',
  city: 'Berlin',
  postalCode: '10115',
  country: 'Deutschland',
};

async function fulfillOverlapHistory(route: Route): Promise<void> {
  const now = '2026-10-02T12:00:00.000Z';
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      activeCount: 2,
      subscriptions: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          createdAt: now,
          updatedAt: now,
          startsAt: '2026-08-01T00:00:00.347Z',
          accessEndsAt: null,
          orgId: '33333333-3333-4333-8333-333333333333',
          type: 'USAGE_BASED',
          monthlyCredits: 1000,
          nextRenewalDate: '2026-11-01T00:00:00.000Z',
          billingInfo,
          status: 'ACTIVE',
          isLatest: true,
        },
        {
          id: '22222222-2222-4222-8222-222222222222',
          createdAt: '2025-08-01T00:00:00.000Z',
          updatedAt: now,
          cancelledAt: '2026-07-15T00:00:00.000Z',
          startsAt: '2025-08-01T00:00:00.000Z',
          accessEndsAt: null,
          orgId: '33333333-3333-4333-8333-333333333333',
          type: 'SEAT_BASED',
          noOfSeats: 25,
          nextRenewalDate: '2027-08-01T00:00:00.000Z',
          billingInfo,
          status: 'CANCELLED',
          isLatest: false,
        },
      ],
    }),
  });
}

async function prepareOverlapPage(page: Page) {
  await page.context().clearCookies();
  const loginResponse = await page.request.post(
    `${config.apiURL}/api/auth/login`,
    {
      data: { email: 'admin@demo.local', password: 'admin' },
    },
  );
  if (!loginResponse.ok()) {
    throw new Error(`Could not authenticate PR media scene: ${loginResponse.status()}`);
  }
  await page.route(
    /\/api\/super-admin\/subscriptions\/[^/]+$/,
    async (route) => {
      const now = '2026-10-02T12:00:00.000Z';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          subscription: {
            id: '11111111-1111-4111-8111-111111111111',
            createdAt: now,
            updatedAt: now,
            startsAt: '2026-08-01T00:00:00.347Z',
            accessEndsAt: null,
            orgId: '33333333-3333-4333-8333-333333333333',
            type: 'USAGE_BASED',
            monthlyCredits: 1000,
            nextRenewalDate: '2026-11-01T00:00:00.000Z',
            billingInfo,
          },
        }),
      });
    },
  );
  await page.route(
    '**/api/super-admin/subscriptions/*/history',
    fulfillOverlapHistory,
  );
  const response = await page.request.post(
    `${config.apiURL}/api/super-admin/orgs`,
    { data: { name: `PR Media Overlap ${Date.now()}` } },
  );
  if (!response.ok()) {
    throw new Error(`Could not create PR media organization: ${response.status()}`);
  }
  const org = (await response.json()) as { id: string };
  await page.goto(`/super-admin-settings/orgs/${org.id}?tab=subscriptions`);
  return page.getByTestId('resolve-subscription-overlap-trigger');
}

export default [
  {
    name: 'subscription-overlap-recovery',
    path: '/super-admin-settings/orgs',
    viewports: ['desktop'],
    waitFor: async ({ page }) => prepareOverlapPage(page),
    demos: [
      {
        name: 'correction-dialog',
        action: async ({ page }) => {
          await page
            .getByTestId('resolve-subscription-overlap-trigger')
            .click();
          await page.getByTestId('subscription-authoritative-select').click();
          await page
            .getByTestId(
              'subscription-authoritative-11111111-1111-4111-8111-111111111111',
            )
            .click();
          await page.getByTestId('subscription-overlap-reason').fill(
            'Vertragswechsel zum 1. August dokumentiert',
          );
        },
      },
    ],
  },
] satisfies PrMediaScene[];
