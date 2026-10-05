import { submitLoginThroughUi } from "../../src/flows/auth.flow";
import { request as apiRequest } from "@playwright/test";
import { config } from "../../src/config";
import { createOrg } from "../../src/factories/org.factory";
import { getEffectiveLanguageModels } from "../../src/clients/api/models.client";
import { test, expect } from "../../src/fixtures/test";
import {
  login,
  getCurrentUser,
  submitLoginAttempt,
  markWelcomeVideoSeen,
} from "../../src/clients/api/auth.client";
import {
  createEmptyThread,
  getThread,
} from "../../src/clients/api/threads.client";
import {
  createSuperAdminOrg,
  getSuperAdminOrg,
} from "../../src/clients/api/super-admin-orgs.client";
import {
  listOrgs,
  requestOrgArchive,
  requestOrgDeletion,
  requestCurrentUser,
  requestRefresh,
} from "../../src/clients/api/org-lifecycle.client";

test.use({ storageState: { cookies: [], origins: [] } });
test.setTimeout(150_000);

test("organisation lifecycle: archive, restore and delete with independent principals", async ({
  page,
  publicApi,
  browser,
}, testInfo) => {
  const org = await createOrg(
    `lifecycle-${Date.now()}`,
    testInfo.outputPath("owner.json"),
  );
  const api = await apiRequest.newContext({
    baseURL: config.apiURL,
    storageState: org.storageState,
  });
  const customer = await getCurrentUser(api);
  const model = (await getEffectiveLanguageModels(api))[0];
  expect(model).toBeDefined();
  const thread = await createEmptyThread(api, model.id);
  const oldState = await api.storageState();
  const oldContext = await browser.newContext({ storageState: oldState });
  const memberContext = await browser.newContext({ baseURL: config.baseURL });
  const memberPage = await memberContext.newPage();
  try {
    expect((await requestOrgArchive(api, customer.orgId, true)).status()).toBe(
      403,
    );
    expect(
      (await requestOrgDeletion(api, customer.orgId, org.orgName)).status(),
    ).toBe(403);
    await login(publicApi, "admin@demo.local", "admin");
    await markWelcomeVideoSeen(publicApi);
    await page.context().addCookies((await publicApi.storageState()).cookies);
    await page.goto(`/super-admin-settings/orgs/${customer.orgId}`);
    await page.getByTestId("org-archive-toggle").click();
    await page.getByTestId("confirmation-confirm").click();
    await expect
      .poll(() => getSuperAdminOrg(publicApi, customer.orgId))
      .toMatchObject({ archived: true });
    await oldContext.clearCookies();
    await oldContext.addCookies(oldState.cookies);
    await expect
      .poll(
        async () => (await requestCurrentUser(oldContext.request)).status(),
        {
          timeout: 35_000,
        },
      )
      .toBe(401);
    await oldContext.clearCookies();
    await oldContext.addCookies(oldState.cookies);
    expect((await requestRefresh(oldContext.request)).status()).toBe(401);
    const rejectedLogin = await submitLoginAttempt(
      api,
      org.admin.email,
      org.admin.password,
    );
    expect(rejectedLogin.status()).toBe(401);
    await expect(rejectedLogin.json()).resolves.toMatchObject({
      code: "ORG_NOT_ACTIVE",
    });
    await submitLoginThroughUi(memberPage, org.admin.email, org.admin.password);
    await expect(
      memberPage.getByRole("listitem").filter({
        hasText:
          /Ihre Organisation ist nicht aktiv|Your organisation is not active/,
      }),
    ).toBeVisible();
    await expect(memberPage).toHaveURL(/\/login/);
    expect(
      (await listOrgs(publicApi, org.orgName)).data.map((row) => row.id),
    ).not.toContain(customer.orgId);
    await page.goto(
      `/super-admin-settings/orgs?search=${encodeURIComponent(org.orgName)}`,
    );
    await expect(page.getByTestId(`org-row-${customer.orgId}`)).toHaveCount(0);
    await page.getByTestId("org-status-filter").click();
    await page.getByTestId("org-filter-archived").click();
    await page.getByTestId(`org-row-${customer.orgId}`).click();
    await page.getByTestId("org-archive-toggle").click();
    await page.getByTestId("confirmation-confirm").click();
    await expect
      .poll(() => getSuperAdminOrg(publicApi, customer.orgId))
      .toMatchObject({ archived: false });
    await oldContext.clearCookies();
    await oldContext.addCookies(oldState.cookies);
    expect((await requestCurrentUser(oldContext.request)).status()).toBe(401);
    await oldContext.clearCookies();
    await oldContext.addCookies(oldState.cookies);
    expect((await requestRefresh(oldContext.request)).status()).toBe(401);
    await login(api, org.admin.email, org.admin.password);
    await expect(getThread(api, thread.id)).resolves.toMatchObject({
      id: thread.id,
    });
    expect(
      (
        await requestOrgDeletion(publicApi, customer.orgId, `${org.orgName} `)
      ).status(),
    ).toBe(400);
    await page.getByTestId("org-delete-open").click();
    await expect(page.getByTestId("org-delete-confirm")).toBeDisabled();
    await page.getByTestId("org-delete-name").fill(org.orgName);
    await page.getByTestId("org-delete-confirm").click();
    await expect(page).toHaveURL(/\/super-admin-settings\/orgs\/?(?:\?.*)?$/);
    expect(
      (await listOrgs(publicApi, org.orgName, "all")).data.map((row) => row.id),
    ).not.toContain(customer.orgId);
    await expect
      .poll(async () => (await requestCurrentUser(api)).status(), {
        timeout: 35_000,
      })
      .toBe(401);
    expect(
      (
        await submitLoginAttempt(api, org.admin.email, org.admin.password)
      ).status(),
    ).toBe(401);
    const recreated = await createSuperAdminOrg(publicApi, org.orgName);
    expect(recreated.id).not.toBe(customer.orgId);
    await oldContext.clearCookies();
    await oldContext.addCookies(oldState.cookies);
    expect((await requestCurrentUser(oldContext.request)).status()).toBe(401);
  } finally {
    await oldContext.close();
    await memberContext.close();
    await api.dispose();
  }
});

test("organisation lifecycle: deletes an archived organisation directly", async ({
  page,
  publicApi,
}) => {
  await login(publicApi, "admin@demo.local", "admin");
  await markWelcomeVideoSeen(publicApi);
  await page.context().addCookies((await publicApi.storageState()).cookies);
  const org = await createSuperAdminOrg(
    publicApi,
    `Archived delete ${Date.now()}`,
  );
  expect((await requestOrgArchive(publicApi, org.id, true)).ok()).toBe(true);
  await page.goto(`/super-admin-settings/orgs/${org.id}`);
  await page.getByTestId("org-delete-open").click();
  await page.getByTestId("org-delete-name").fill(org.name);
  await page.getByTestId("org-delete-confirm").click();
  await expect(page).toHaveURL(/\/super-admin-settings\/orgs\/?(?:\?.*)?$/);
  expect(
    (await listOrgs(publicApi, org.name, "all")).data.map((row) => row.id),
  ).not.toContain(org.id);
});
