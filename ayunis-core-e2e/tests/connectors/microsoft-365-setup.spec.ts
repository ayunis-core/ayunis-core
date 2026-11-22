import { request } from '@playwright/test';
import type { APIRequestContext, TestInfo } from '@playwright/test';
import { config } from '../../src/config';
import {
  getMicrosoft365Connector,
  requestMicrosoft365Connector,
  saveMicrosoft365Connector,
} from '../../src/clients/api/connectors.client';
import { createOrg } from '../../src/factories/org.factory';
import type { OrgContext } from '../../src/factories/org.factory';
import { createMemberSession } from '../../src/factories/user.factory';
import { expect, test } from '../../src/fixtures/test';

const TENANT_ID = '6f1c2c4e-3c1a-4f4e-9a59-2f1f0b8a7d11';
const OTHER_TENANT_ID = '9a592f1f-0b8a-4d11-8f4e-6f1c2c4e3c1a';
const CLIENT_ID = '0b8a7d11-2f1f-4f4e-9a59-6f1c2c4e3c1a';

// Own organizations: the worker org is shared with the Connections spec,
// which expects Microsoft 365 not to be set up.
async function freshOrg(
  testInfo: TestInfo,
  key: string,
): Promise<{ org: OrgContext; api: APIRequestContext }> {
  const org = await createOrg(
    `m365-${key}-${Date.now()}`,
    testInfo.outputPath(`${key}.json`),
  );
  const api = await request.newContext({
    baseURL: config.apiURL,
    storageState: org.storageState,
  });
  return { org, api };
}

test('an org admin sets up, changes and removes the Microsoft 365 connection; the secret never comes back', async ({
  browser,
}, testInfo) => {
  const secret = `Zq8~e2e-secret-${Date.now()}`;
  const { org, api } = await freshOrg(testInfo, 'setup');
  const context = await browser.newContext({ storageState: org.storageState });
  try {
    const page = await context.newPage();
    const field = (name: string) =>
      page.getByTestId(`microsoft-365-connector-${name}`);

    await page.goto('/admin-settings/integrations');
    await page.getByTestId('connections-connector-microsoft_365').click();
    await expect(page).toHaveURL(
      /\/admin-settings\/integrations\/microsoft-365$/,
    );
    await field('tenant-id').fill(TENANT_ID);
    await field('client-id').fill(CLIENT_ID);
    await field('client-secret').fill(secret);
    await field('save').click();

    await expect(field('remove')).toBeVisible();
    await expect(field('client-secret')).toHaveValue('');
    const afterSetUp = await requestMicrosoft365Connector.get(api);
    expect(await afterSetUp.text()).not.toContain(secret);
    expect(await afterSetUp.json()).toEqual({
      status: 'set_up',
      tenantId: TENANT_ID,
      clientId: CLIENT_ID,
    });

    // Without re-entering the secret: the connection stays set up.
    await field('tenant-id').fill(OTHER_TENANT_ID);
    await field('save').click();
    await expect
      .poll(() => getMicrosoft365Connector(api))
      .toEqual({
        status: 'set_up',
        tenantId: OTHER_TENANT_ID,
        clientId: CLIENT_ID,
      });
    await page.reload();
    await expect(field('tenant-id')).toHaveValue(OTHER_TENANT_ID);

    await field('remove').click();
    await page.getByTestId('confirmation-confirm').click();
    await expect(field('remove')).toHaveCount(0);
    await expect(field('tenant-id')).toHaveValue('');
    expect(await getMicrosoft365Connector(api)).toEqual({
      status: 'not_set_up',
      tenantId: null,
      clientId: null,
    });
    await page.goto('/admin-settings/integrations');
    await expect(
      page.getByTestId('connections-connector-microsoft_365'),
    ).toHaveAttribute('data-status', 'not_set_up');
  } finally {
    await context.close();
    await api.dispose();
  }
});

test("only the organization's own admins can change its Microsoft 365 connection", async ({
  mail,
}, testInfo) => {
  const setUp = { tenantId: TENANT_ID, clientId: CLIENT_ID };
  const ours = await freshOrg(testInfo, 'ours');
  const theirs = await freshOrg(testInfo, 'theirs');
  const { api: memberApi } = await createMemberSession(
    ours.api,
    mail,
    `m365-member-${Date.now()}`,
  );
  try {
    await saveMicrosoft365Connector(ours.api, {
      ...setUp,
      clientSecret: 'ours-secret',
    });

    expect((await requestMicrosoft365Connector.get(memberApi)).status()).toBe(
      403,
    );
    expect(
      (
        await requestMicrosoft365Connector.save(memberApi, {
          ...setUp,
          clientSecret: 'member-secret',
        })
      ).status(),
    ).toBe(403);
    expect(
      (await requestMicrosoft365Connector.remove(memberApi)).status(),
    ).toBe(403);

    // Another organization's admin sees and changes only their own.
    expect(await getMicrosoft365Connector(theirs.api)).toMatchObject({
      status: 'not_set_up',
    });
    await saveMicrosoft365Connector(theirs.api, {
      tenantId: OTHER_TENANT_ID,
      clientId: CLIENT_ID,
      clientSecret: 'their-secret',
    });
    expect(
      (await requestMicrosoft365Connector.remove(theirs.api)).status(),
    ).toBe(204);

    expect(await getMicrosoft365Connector(ours.api)).toEqual({
      status: 'set_up',
      ...setUp,
    });
  } finally {
    await memberApi.dispose();
    await ours.api.dispose();
    await theirs.api.dispose();
  }
});
