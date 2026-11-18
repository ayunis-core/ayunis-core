import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import {
  aCapabilityContext,
  createAssembleToolUseCase,
  TEST_ORG_ID,
  TEST_USER_ID,
  toolNames,
} from 'src/domain/runs/testing/run-capability.fixture';
import type { HasPermissionQuery } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.query';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { MarketplaceCapability } from './marketplace.capability';

const userContext = {
  get: (key: string) =>
    ({
      userId: TEST_USER_ID,
      orgId: TEST_ORG_ID,
      role: UserRole.USER,
      systemRole: SystemRole.CUSTOMER,
    })[key],
};

const buildCapability = (
  enabled: boolean,
  granted: Permission[] = [Permission.INSTALL_MARKETPLACE_SKILLS],
) =>
  new MarketplaceCapability(
    { enabled } as never,
    createAssembleToolUseCase(),
    userContext as never,
    {
      execute: (query: HasPermissionQuery) =>
        Promise.resolve(granted.includes(query.permission)),
    } as never,
  );

describe('MarketplaceCapability', () => {
  it('offers search and install when a marketplace is configured', async () => {
    expect(
      toolNames(await buildCapability(true).contribute(aCapabilityContext())),
    ).toEqual([
      ToolType.MARKETPLACE_SEARCH,
      ToolType.INSTALL_MARKETPLACE_SKILL,
    ]);
  });

  it('offers no install card or install links to members whose role may not install Marketplace skills', async () => {
    expect(
      await buildCapability(true, [Permission.MANAGE_SKILLS]).contribute(
        aCapabilityContext(),
      ),
    ).toEqual({});
  });

  it('offers nothing when no marketplace is configured', async () => {
    expect(
      await buildCapability(false).contribute(aCapabilityContext()),
    ).toEqual({});
  });

  it('offers nothing when the model cannot use tools', async () => {
    expect(
      await buildCapability(true).contribute(
        aCapabilityContext({ canUseTools: false }),
      ),
    ).toEqual({});
  });
});
