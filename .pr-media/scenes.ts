import type { PrMediaScene } from './types';

const billingInfo = {
  companyName: 'Beispiel Kommune',
  street: 'Rathausplatz',
  houseNumber: '1',
  city: 'Berlin',
  postalCode: '10115',
  country: 'Deutschland',
};

export default [
  {
    name: 'subscription-overlap-recovery',
    path: '/super-admin-settings/orgs',
    viewports: ['desktop'],
    waitFor: async ({ page }) =>
      page.locator('a[href^="/super-admin-settings/orgs/"]').first(),
    demos: [
      {
        name: 'correction-dialog',
        action: async ({ page }) => {
          await page.route(
            '**/api/super-admin/subscriptions/*/history',
            async (route) => {
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
                      startsAt: '2026-08-01T00:00:00.000Z',
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
            },
          );
          const href = await page
            .locator('a[href^="/super-admin-settings/orgs/"]')
            .first()
            .getAttribute('href');
          if (!href) throw new Error('No organization link found');
          await page.goto(`${href}?tab=subscriptions`);
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
