import { login, markWelcomeVideoSeen } from "../../src/clients/api/auth.client";
import { createSuperAdminOrg } from "../../src/clients/api/super-admin-orgs.client";
import {
  createSuperAdminSubscription,
  e2eSubscriptionBilling,
} from "../../src/clients/api/super-admin-subscriptions.client";
import { test, expect } from "../../src/fixtures/test";

test.use({ storageState: { cookies: [], origins: [] } });
const managedBaseUrl =
  process.env.E2E_FYNN_MANAGED_BASE_URL ?? "http://localhost:3002";

test("super admin sees subscription data and Academy as read-only with the Fynn capability", async ({
  page,
  publicApi,
}) => {
  await login(publicApi, "admin@demo.local", "admin");
  await markWelcomeVideoSeen(publicApi);
  await page.context().addCookies((await publicApi.storageState()).cookies);
  const org = await createSuperAdminOrg(publicApi, `Fynn UI E2E ${Date.now()}`);
  await createSuperAdminSubscription(publicApi, org.id, {
    ...e2eSubscriptionBilling,
    type: "USAGE_BASED",
    monthlyCredits: 1500,
  });

  await page.goto(
    `${managedBaseUrl}/super-admin-settings/orgs/${org.id}?tab=subscriptions`,
  );
  await expect(
    page.getByTestId("fynn-managed-subscription-notice"),
  ).toBeVisible();
  await expect(page.getByTestId("subscription-change")).toHaveCount(0);
  await expect(page.getByTestId("subscription-readonly-details")).toBeVisible();
  await expect(
    page.getByTestId("subscription-readonly-details").getByRole("button"),
  ).toHaveCount(0);

  await page.goto(
    `${managedBaseUrl}/super-admin-settings/orgs/${org.id}?tab=addons`,
  );
  await expect(
    page.getByTestId("addon-ayunis_core_academy-toggle"),
  ).toBeDisabled();
});
