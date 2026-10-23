import { getCurrentUser, login } from "../../src/clients/api/auth.client";
import { dismissWelcomeVideo } from "../../src/clients/api/onboarding.client";
import { test, expect } from "../../src/fixtures/test";

test.use({ storageState: { cookies: [], origins: [] } });

for (const superAdmin of [false, true]) {
  const loginEmail = superAdmin ? "admin@demo.local" : "admin@usage.local";
  const endpointTemplate = superAdmin
    ? "/api/super-admin/orgs/:orgId/invites/bulk"
    : "/api/invites/bulk";
  const usersPath = superAdmin
    ? "/super-admin-settings/orgs/:orgId?tab=users"
    : "/admin-settings/users";
  const triggers = superAdmin
    ? ["super-admin-bulk-invite"]
    : ["invite-menu-trigger", "bulk-invite-menu-item"];

  test(`bulk import explains subscription overlap for ${superAdmin ? "super admin" : "org admin"}`, async ({
    page,
    publicApi,
  }, testInfo) => {
    await login(publicApi, "admin@usage.local", "admin");
    const orgId = (await getCurrentUser(publicApi)).orgId;
    await login(publicApi, loginEmail, "admin");
    await dismissWelcomeVideo(publicApi);
    await page.context().addCookies((await publicApi.storageState()).cookies);
    const endpoint = endpointTemplate.replace(":orgId", orgId);

    // The E2E stack is self-hosted. Replay the cloud subscription error at the
    // HTTP boundary; the retry below uses the real invitation endpoint.
    await page.route(`**${endpoint}`, async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ code: "MULTIPLE_ACTIVE_SUBSCRIPTIONS" }),
      });
    });
    await page.goto(usersPath.replace(":orgId", orgId));
    for (const trigger of triggers) {
      await page.getByTestId(trigger).click();
    }
    await page.getByTestId("bulk-invite-file-input").setInputFiles({
      name: "users.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        `email,role\nbulk-overlap-${superAdmin}-${Date.now()}@e2e.local,user`,
      ),
    });
    await page.getByTestId("bulk-invite-submit").click();
    await expect(page.getByRole("region")).toContainText(
      "Die Abonnements dieser Organisation überschneiden sich. Ein Superadmin muss die Überschneidung beheben, bevor Benutzer eingeladen werden können.",
    );
    await expect(page.getByTestId("bulk-invite-submit")).toBeEnabled();
    await page.screenshot({
      path: testInfo.outputPath("subscription-overlap.png"),
    });
    await page.unroute(`**${endpoint}`);
    const retry = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === endpoint &&
        response.request().method() === "POST",
    );
    await page.getByTestId("bulk-invite-submit").click();
    expect((await retry).status()).toBe(201);
    await expect(page.getByTestId("bulk-invite-submit")).toHaveCount(0);
  });
}
