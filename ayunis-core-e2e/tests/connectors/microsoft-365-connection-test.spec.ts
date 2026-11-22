import { request } from '@playwright/test';
import type { APIRequestContext, TestInfo } from '@playwright/test';
import { config } from '../../src/config';
import {
  requestMicrosoft365Connector,
  saveMicrosoft365Connector,
  testMicrosoft365Connection,
} from '../../src/clients/api/connectors.client';
import { createOrg } from '../../src/factories/org.factory';
import { createMemberSession } from '../../src/factories/user.factory';
import { expect, test } from '../../src/fixtures/test';

// Keep in sync with CONNECTED_TENANT_ID in src/servers/entra-mock.mjs: the
// Entra stand-in grants this tenant's app Sites.Selected and
// Files.SelectedOperations.Selected, and knows no other tenant.
const CONNECTED_TENANT_ID = 'e2e0c0de-1a2b-4c3d-8e4f-5a6b7c8d9e0f';
const UNKNOWN_TENANT_ID = '9a592f1f-0b8a-4d11-8f4e-6f1c2c4e3c1a';
const CLIENT_ID = '0b8a7d11-2f1f-4f4e-9a59-6f1c2c4e3c1a';

async function freshOrgApi(
  testInfo: TestInfo,
  key: string,
): Promise<{ storageState: string; api: APIRequestContext }> {
  const { storageState } = await createOrg(
    `m365-test-${key}-${Date.now()}`,
    testInfo.outputPath(`${key}.json`),
  );
  const api = await request.newContext({
    baseURL: config.apiURL,
    storageState,
  });
  return { storageState, api };
}

test('saving tests the Microsoft 365 connection, and the admin can test it again', async ({
  browser,
}, testInfo) => {
  const { storageState, api } = await freshOrgApi(testInfo, 'journey');
  const context = await browser.newContext({ storageState });
  try {
    const page = await context.newPage();
    const field = (name: string) =>
      page.getByTestId(`microsoft-365-connector-${name}`);
    const result = page.getByTestId('microsoft-365-connection-test-result');
    const permission = (name: string) =>
      page.getByTestId(`microsoft-365-connection-test-permission-${name}`);

    await page.goto('/admin-settings/integrations/microsoft-365');
    await field('tenant-id').fill(CONNECTED_TENANT_ID);
    await field('client-id').fill(CLIENT_ID);
    // The secret's ID is a GUID shown next to its value in Entra.
    await field('client-secret').fill('b1c2d3e4-5f60-4a7b-8c9d-0e1f2a3b4c5d');
    await expect(field('client-secret-id-warning')).toBeVisible();
    await field('client-secret').fill(`Zq8~e2e-secret-${Date.now()}`);
    await expect(field('client-secret-id-warning')).toHaveCount(0);
    await field('save').click();

    await expect(result).toHaveAttribute('data-outcome', 'connected');
    await expect(permission('Sites.Selected')).toHaveAttribute(
      'data-granted',
      'true',
    );
    await expect(permission('Lists.SelectedOperations.Selected')).toHaveAttribute(
      'data-granted',
      'false',
    );

    await field('tenant-id').fill(UNKNOWN_TENANT_ID);
    await field('save').click();
    await expect(result).toHaveAttribute('data-outcome', 'tenant_not_found');
    await expect(permission('Sites.Selected')).toHaveCount(0);

    // Fixed outside this page: testing again reads the stored connection.
    await saveMicrosoft365Connector(api, {
      tenantId: CONNECTED_TENANT_ID,
      clientId: CLIENT_ID,
    });
    await field('test').click();
    await expect(result).toHaveAttribute('data-outcome', 'connected');
  } finally {
    await context.close();
    await api.dispose();
  }
});

test("only the organization's own admins can test its Microsoft 365 connection", async ({
  mail,
}, testInfo) => {
  const ours = await freshOrgApi(testInfo, 'ours');
  const theirs = await freshOrgApi(testInfo, 'theirs');
  const { api: memberApi } = await createMemberSession(
    ours.api,
    mail,
    `m365-test-member-${Date.now()}`,
  );
  try {
    await saveMicrosoft365Connector(ours.api, {
      tenantId: CONNECTED_TENANT_ID,
      clientId: CLIENT_ID,
      clientSecret: 'ours-secret',
    });

    expect((await requestMicrosoft365Connector.test(memberApi)).status()).toBe(
      403,
    );
    // Another organization's admin tests only their own connection.
    const theirsBeforeSetUp = await requestMicrosoft365Connector.test(
      theirs.api,
    );
    expect(theirsBeforeSetUp.status()).toBe(404);
    expect(await theirsBeforeSetUp.json()).toMatchObject({
      code: 'CONNECTOR_NOT_SET_UP',
    });

    await saveMicrosoft365Connector(theirs.api, {
      tenantId: UNKNOWN_TENANT_ID,
      clientId: CLIENT_ID,
      clientSecret: 'their-secret',
    });
    expect(await testMicrosoft365Connection(theirs.api)).toMatchObject({
      outcome: 'tenant_not_found',
      entraErrorCode: 'AADSTS90002',
    });
    expect(await testMicrosoft365Connection(ours.api)).toMatchObject({
      outcome: 'connected',
      entraErrorCode: null,
    });
  } finally {
    await memberApi.dispose();
    await ours.api.dispose();
    await theirs.api.dispose();
  }
});
