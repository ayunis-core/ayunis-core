import { login, markWelcomeVideoSeen } from "../../src/clients/api/auth.client";
import { createSuperAdminOrg } from "../../src/clients/api/super-admin-orgs.client";
import {
  createSuperAdminSubscription,
  cancelSuperAdminSubscription,
  uncancelSuperAdminSubscription,
  e2eSubscriptionBilling,
  getSuperAdminSubscriptionHistory,
} from "../../src/clients/api/super-admin-subscriptions.client";
import { test, expect } from "../../src/fixtures/test";

test.use({ storageState: { cookies: [], origins: [] } });

test("super admin creates a subscription with a date picked in the UI", async ({
  page,
  publicApi,
}) => {
  await login(publicApi, "admin@demo.local", "admin");
  await markWelcomeVideoSeen(publicApi);
  await page.context().addCookies((await publicApi.storageState()).cookies);
  await page.addInitScript(() => localStorage.setItem("ayunis-language", "en"));
  const org = await createSuperAdminOrg(
    publicApi,
    `Bounded subscription UI ${Date.now()}`,
  );
  await page.goto(`/super-admin-settings/orgs/${org.id}?tab=subscriptions`);
  await page
    .getByRole("button", { name: "Create Subscription", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  for (const [label, value] of Object.entries({
    "Company Name": e2eSubscriptionBilling.companyName,
    Street: e2eSubscriptionBilling.street,
    "House Number": e2eSubscriptionBilling.houseNumber,
    "Postal Code": e2eSubscriptionBilling.postalCode,
    City: e2eSubscriptionBilling.city,
    Country: e2eSubscriptionBilling.country,
  })) {
    await dialog.getByRole("textbox", { name: label, exact: true }).fill(value);
  }
  await dialog.getByTestId("subscription-end-date-picker").click();
  await page
    .getByRole("combobox", { name: /year/i })
    .selectOption(String(new Date().getFullYear() + 1));
  await page.getByRole("combobox", { name: /month/i }).selectOption("0");
  await page.getByRole("button", { name: /January 15th,/ }).click();
  await dialog
    .getByRole("button", { name: "Create Subscription", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await getSuperAdminSubscriptionHistory(publicApi, org.id))
          .subscriptions.length,
    )
    .toBe(1);
  const history = await getSuperAdminSubscriptionHistory(publicApi, org.id);
  const subscription = history.subscriptions[0];
  expect(subscription?.accessEndsAt).toBeTruthy();
  expect(new Date(subscription!.accessEndsAt!).getFullYear()).toBe(
    new Date().getFullYear() + 1,
  );
  expect(subscription?.cancelledAt).toBeNull();
  expect(subscription?.status).toBe("ACTIVE");
});

test("a bounded subscription is historical after its end and can be followed by a new period", async ({
  publicApi,
}) => {
  await login(publicApi, "admin@demo.local", "admin");
  const org = await createSuperAdminOrg(
    publicApi,
    `Bounded subscription lifecycle ${Date.now()}`,
  );
  const now = Date.now();
  const accessEndsAt = new Date(now - 60_000).toISOString();
  await createSuperAdminSubscription(publicApi, org.id, {
    ...e2eSubscriptionBilling,
    type: "USAGE_BASED",
    monthlyCredits: 1000,
    startsAt: new Date(now - 120_000).toISOString(),
    ...{ accessEndsAt },
  });
  const expired = await getSuperAdminSubscriptionHistory(publicApi, org.id);
  expect(expired.activeCount).toBe(0);
  expect(expired.subscriptions[0]?.status).toBe("HISTORICAL");
  expect(expired.subscriptions[0]?.accessEndsAt).toBe(accessEndsAt);
  expect(expired.subscriptions[0]?.cancelledAt).toBeNull();
  await createSuperAdminSubscription(publicApi, org.id, {
    ...e2eSubscriptionBilling,
    type: "USAGE_BASED",
    monthlyCredits: 2000,
  });
  const recreated = await getSuperAdminSubscriptionHistory(publicApi, org.id);
  expect(recreated.activeCount).toBe(1);
  expect(recreated.subscriptions[0]?.accessEndsAt).toBeNull();
  expect(recreated.subscriptions[0]?.monthlyCredits).toBe(2000);
});

for (const type of ["SEAT_BASED", "USAGE_BASED"] as const) {
  test(`undoing ${type} cancellation restores the persisted fixed end`, async ({
    publicApi,
  }) => {
    await login(publicApi, "admin@demo.local", "admin");
    const org = await createSuperAdminOrg(
      publicApi,
      `Fixed expiry undo ${type} ${Date.now()}`,
    );
    const accessEndsAt = new Date(
      Date.now() + 120 * 24 * 60 * 60 * 1000,
    ).toISOString();
    await createSuperAdminSubscription(publicApi, org.id, {
      ...e2eSubscriptionBilling,
      type,
      noOfSeats: 5,
      monthlyCredits: 1000,
      ...{ accessEndsAt },
    });
    await cancelSuperAdminSubscription(publicApi, org.id);
    const cancelled = await getSuperAdminSubscriptionHistory(publicApi, org.id);
    expect(cancelled.subscriptions[0]?.cancelledAt).toBeTruthy();
    await uncancelSuperAdminSubscription(publicApi, org.id);
    const restored = await getSuperAdminSubscriptionHistory(publicApi, org.id);
    expect(restored.subscriptions[0]?.accessEndsAt).toBe(accessEndsAt);
    expect(restored.subscriptions[0]?.cancelledAt).toBeNull();
    expect(restored.activeCount).toBe(1);
  });
}

test("the API rejects an end equal to the start without creating a subscription", async ({
  publicApi,
}) => {
  await login(publicApi, "admin@demo.local", "admin");
  const org = await createSuperAdminOrg(
    publicApi,
    `Invalid fixed expiry ${Date.now()}`,
  );
  const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await expect(
    createSuperAdminSubscription(publicApi, org.id, {
      ...e2eSubscriptionBilling,
      type: "USAGE_BASED",
      monthlyCredits: 1000,
      startsAt,
      accessEndsAt: startsAt,
    }),
  ).rejects.toThrow(/HTTP 400/);
  expect(
    (await getSuperAdminSubscriptionHistory(publicApi, org.id)).subscriptions,
  ).toHaveLength(0);
});
