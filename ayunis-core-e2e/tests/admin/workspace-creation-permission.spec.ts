import { test, expect } from '../../src/fixtures/test';
import { createSignedInMember } from '../../src/factories/user.factory';
import {
  getRolePermissions,
  setRolePermissions,
} from '../../src/clients/api/role-permissions.client';
import { requestCreateWorkspace } from '../../src/clients/api/workspaces.client';
import { setPermissionInMatrix } from '../../src/flows/role-permissions.flow';

test('members create workspaces only while their role may', async ({
  page,
  api,
  mail,
  browser,
}) => {
  test.setTimeout(90_000);
  const suffix = `workspace-create-${Date.now()}`;
  const userPermissions = await getRolePermissions(api, 'user');
  const member = await createSignedInMember(api, mail, suffix);
  const memberContext = await browser.newContext({
    storageState: member.storageState,
  });
  const memberPage = await memberContext.newPage();

  try {
    await setPermissionInMatrix(page, 'create_workspaces', 'user', false);

    await memberPage.goto('/workspaces');
    await expect(
      memberPage.getByTestId('workspaces-empty-no-create'),
    ).toBeVisible();
    await expect(memberPage.getByTestId('workspaces-create')).toHaveCount(0);
    const denied = await requestCreateWorkspace(member.api, `Denied ${suffix}`);
    expect(denied.status()).toBe(403);

    await setPermissionInMatrix(page, 'create_workspaces', 'user', true);

    await memberPage.reload();
    await expect(
      memberPage.getByTestId('workspaces-create').first(),
    ).toBeVisible();
    const allowed = await requestCreateWorkspace(
      member.api,
      `Allowed ${suffix}`,
    );
    expect(allowed.status()).toBe(201);
  } finally {
    await setRolePermissions(api, 'user', userPermissions);
    await memberContext.close();
    await member.api.dispose();
  }
});
