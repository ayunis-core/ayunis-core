import { randomUUID } from "node:crypto";
import {
  confirmEmail,
  discoverSso,
  getCurrentUser,
  login,
  markWelcomeVideoSeen,
  registerOrg,
} from "../../src/clients/api/auth.client";
import { createApiContext } from "../../src/factories/api-context.factory";
import { test, expect } from "../../src/fixtures/test";

test.use({ storageState: { cookies: [], origins: [] } });

test("does not enforce SSO-only over accounts in another Core organization", async ({
  page,
  publicApi,
  mail,
}) => {
  const key = randomUUID();
  const domain = `external-${key}.example`;
  const password = `E2E-${key}-Aa1`;
  const customerEmail = `admin@customer-${key}.example`;
  const foreignApi = await createApiContext({ cookies: [], origins: [] });
  try {
    await registerOrg(foreignApi, {
      email: `admin@${domain}`,
      password,
      orgName: `Domain owner ${key}`,
      userName: "External admin",
    });
    await registerOrg(publicApi, {
      email: customerEmail,
      password,
      orgName: `SSO target ${key}`,
      userName: "Target admin",
    });
    await confirmEmail(
      publicApi,
      await mail.extractLinkToken(customerEmail, "/confirm-email"),
    );
    await login(publicApi, customerEmail, password);
    const orgId = (await getCurrentUser(publicApi)).orgId;
    const customerApi = await createApiContext(await publicApi.storageState());
    try {
      await login(publicApi, "admin@demo.local", "admin");
      await markWelcomeVideoSeen(publicApi);
      await page.context().addCookies((await publicApi.storageState()).cookies);
      await page.goto(`/super-admin-settings/orgs/${orgId}?tab=sso`);
      await page.getByTestId("sso-email-domain-0").fill(domain);
      await page.getByTestId("sso-zitadel-org-id").fill(`broker-${key}`);
      await page.getByTestId("sso-zitadel-idp-id").fill(`idp-${key}`);
      await page.getByTestId("sso-domain-verified").click();
      await page.getByTestId("sso-connection-save").click();
      await page.getByTestId("sso-enable").click();
      await page.getByTestId("sso-enable-reviewed").click();
      await page.getByTestId("sso-enable-confirm").click();
      await expect(page.getByTestId("sso-email-domain-0")).toBeDisabled();
      await page.getByTestId("sso-required").click();
      await page.getByTestId("sso-required-reviewed").click();
      const rejected = page.waitForResponse(
        (response) =>
          response.request().method() === "PATCH" &&
          new URL(response.url()).pathname ===
            `/api/super-admin/orgs/${orgId}/sso/local-password-login`,
      );
      await page.getByTestId("sso-required-confirm").click();
      const result = await rejected;
      expect(result.status()).toBe(409);
      await expect(result.json()).resolves.toMatchObject({
        code: "SSO_DOMAIN_ACCOUNT_CONFLICT",
      });
      await page.reload();
      await expect(page.getByTestId("sso-required")).not.toBeChecked();
      await expect(discoverSso(publicApi, `admin@${domain}`)).resolves.toEqual({
        available: true,
        orgId,
        localPasswordLoginEnabled: true,
      });
      await expect(getCurrentUser(customerApi)).resolves.toMatchObject({
        orgId,
      });
      await login(customerApi, customerEmail, password);
      await expect(getCurrentUser(customerApi)).resolves.toMatchObject({
        orgId,
      });
    } finally {
      await customerApi.dispose();
    }
  } finally {
    await foreignApi.dispose();
  }
});
