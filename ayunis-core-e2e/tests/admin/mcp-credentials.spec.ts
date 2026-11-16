import { test, expect } from '../../src/fixtures/test';
import { createCustomIntegration, getUserIntegrationConfig, setUserIntegrationConfig } from '../../src/clients/api/integrations.client';
import { createMemberSession } from '../../src/factories/user.factory';

test('verifies personal credentials before saving and disconnects independently of the provider', async ({ page, api, mail, echoMcpServer }) => {
  const token = `valid-${Date.now()}`;
  echoMcpServer.setAcceptedToken(token);
  const integration = await createCustomIntegration(api, {
    name: `Verified MCP ${Date.now()}`,
    serverUrl: echoMcpServer.url,
    configSchema: { authType: 'CUSTOM', orgFields: [], userFields: [{ key: 'personalToken', label: 'Personal token', type: 'secret', headerName: 'Authorization', prefix: 'Bearer ', required: true }] },
    orgConfigValues: {},
  });
  const member = await createMemberSession(api, mail, `mcp-${Date.now()}`);
  try {
    await page.goto('/settings/integrations');
    const open = page.getByTestId(`integration-configure-${integration.id}`);
    await open.click();
    const input = page.getByTestId('user-config-personalToken');
    const save = page.getByTestId('user-config-save');
    await input.fill('invalid-candidate');
    const rejected = page.waitForResponse(response => response.url().endsWith(`/${integration.id}/user-config`) && response.request().method() === 'PATCH');
    await save.click();
    const failure = await rejected;
    expect(failure.status()).toBe(422);
    expect(await failure.text()).not.toContain('invalid-candidate');
    await expect(page.getByRole('dialog')).toBeVisible();
    expect((await getUserIntegrationConfig(api, integration.id)).hasConfig).toBe(false);

    await input.fill(token);
    await save.click();
    await expect(page.getByRole('dialog')).toBeHidden();
    expect((await getUserIntegrationConfig(api, integration.id)).hasConfig).toBe(true);
    expect((await getUserIntegrationConfig(member.api, integration.id)).hasConfig).toBe(false);

    await expect(setUserIntegrationConfig(member.api, integration.id, { configValues: { personalToken: 'invalid-member-token' } })).rejects.toThrow('HTTP 422');
    expect((await getUserIntegrationConfig(api, integration.id)).hasConfig).toBe(true);
    await setUserIntegrationConfig(member.api, integration.id, { configValues: { personalToken: token } });

    await open.click();
    await input.fill('invalid-replacement');
    const replacement = page.waitForResponse(response => response.url().endsWith(`/${integration.id}/user-config`) && response.request().method() === 'PATCH');
    await save.click();
    expect((await replacement).status()).toBe(422);
    await expect(page.getByRole('dialog')).toBeVisible();
    await setUserIntegrationConfig(api, integration.id, { configValues: {} });
    expect(echoMcpServer.calls).toEqual([]);

    echoMcpServer.setAcceptedToken('revoked');
    await page.getByTestId('user-config-disconnect').click();
    await expect(page.getByRole('dialog')).toBeHidden();
    expect((await getUserIntegrationConfig(api, integration.id)).hasConfig).toBe(false);
    expect((await getUserIntegrationConfig(member.api, integration.id)).hasConfig).toBe(true);

    echoMcpServer.setAcceptedToken(token);
    await open.click();
    await input.fill(token);
    await save.click();
    await expect(page.getByRole('dialog')).toBeHidden();
    expect((await getUserIntegrationConfig(api, integration.id)).hasConfig).toBe(true);
  } finally {
    await member.api.dispose();
  }
});
