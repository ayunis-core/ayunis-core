import { test, expect } from '../../src/fixtures/test';
import { createSignedInMember } from '../../src/factories/user.factory';
import {
  getRolePermissions,
  setRolePermissions,
} from '../../src/clients/api/role-permissions.client';
import { requestInstallMarketplaceSkill } from '../../src/clients/api/marketplace.client';

test('marketplace installs need install_marketplace_skills, not manage_own_skills', async ({
  api,
  mail,
}) => {
  const userPermissions = await getRolePermissions(api, 'user');
  const withoutInstall = userPermissions.filter(
    (permission) => permission !== 'install_marketplace_skills',
  );
  const member = await createSignedInMember(
    api,
    mail,
    `marketplace-install-${Date.now()}`,
  );

  try {
    expect(withoutInstall).toContain('manage_own_skills');
    await setRolePermissions(api, 'user', withoutInstall);

    const denied = await requestInstallMarketplaceSkill(
      member.api,
      'e2e-unknown-skill',
    );
    expect(denied.status()).toBe(403);

    await setRolePermissions(api, 'user', [
      ...withoutInstall,
      'install_marketplace_skills',
    ]);

    const allowed = await requestInstallMarketplaceSkill(
      member.api,
      'e2e-unknown-skill',
    );
    expect(allowed.status()).not.toBe(403);
  } finally {
    await setRolePermissions(api, 'user', userPermissions);
    await member.api.dispose();
  }
});
