import type { Page } from "@playwright/test";
import { test, expect } from "../../src/fixtures/test";

const SERVICE_UNAVAILABLE_MESSAGE =
  "Der Dienst ist vorübergehend nicht verfügbar. Bitte versuchen Sie es später erneut.";

test.use({ storageState: { cookies: [], origins: [] } });

test("shows service unavailable when SSO discovery cannot reach the database", async ({
  page,
}) => {
  await fulfillServiceUnavailable(page, "**/api/auth/sso/discover");
  await page.goto("/login");

  await page.getByTestId("email").fill("maria.muster@stadt.example");
  await page.getByTestId("login-continue").click();

  await expect(notificationRegion(page)).toContainText(
    SERVICE_UNAVAILABLE_MESSAGE,
  );
});

test("shows service unavailable when password login cannot reach the database", async ({
  page,
}) => {
  await page.route("**/api/auth/sso/discover", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ available: false }),
    }),
  );
  await fulfillServiceUnavailable(page, "**/api/auth/login");
  await page.goto("/login");

  await page.getByTestId("email").fill("maria.muster@stadt.example");
  await page.getByTestId("login-continue").click();
  await page.getByTestId("password").fill("Valid-password-1");
  await page.getByTestId("submit").click();

  await expect(notificationRegion(page)).toContainText(
    SERVICE_UNAVAILABLE_MESSAGE,
  );
  await expect(page).toHaveURL(/\/login/);
});

test("shows service unavailable when forgot-password cannot reach the database", async ({
  page,
}) => {
  await fulfillServiceUnavailable(page, "**/api/users/forgot-password");
  await page.goto("/password/forgot");

  await page.getByTestId("forgot-email").fill("maria.muster@stadt.example");
  await page.getByTestId("forgot-submit").click();

  await expect(notificationRegion(page)).toContainText(
    SERVICE_UNAVAILABLE_MESSAGE,
  );
  await expect(page).toHaveURL(/\/password\/forgot/);
});

async function fulfillServiceUnavailable(
  page: Page,
  url: string,
): Promise<void> {
  await page.route(url, (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ code: "SERVICE_UNAVAILABLE" }),
    }),
  );
}

function notificationRegion(page: Page) {
  return page.getByRole("region", { name: "Notifications alt+T" });
}
