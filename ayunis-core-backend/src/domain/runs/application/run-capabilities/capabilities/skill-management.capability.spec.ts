import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import type { SkillCatalog } from 'src/domain/runs/application/run-capabilities/run-capability-context';
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
import { SkillManagementCapability } from './skill-management.capability';

const catalog: SkillCatalog = {
  slugMap: new Map([
    ['user__german-administrative-law', 'German Administrative Law'],
  ]),
  editableSkillIds: new Map([
    ['user__german-administrative-law', '77777777-7777-4777-8777-777777777777'],
  ]),
  entries: [
    {
      slug: 'user__german-administrative-law',
      description: 'Answers questions on German administrative law',
    },
  ],
};

const userContext = {
  get: (key: string) =>
    ({
      userId: TEST_USER_ID,
      orgId: TEST_ORG_ID,
      role: UserRole.USER,
      systemRole: SystemRole.CUSTOMER,
    })[key],
};

const allPermissions = [
  Permission.MANAGE_SKILLS,
  Permission.INSTALL_MARKETPLACE_SKILLS,
];

const buildCapability = ({
  marketplaceEnabled = true,
  granted = allPermissions,
}: { marketplaceEnabled?: boolean; granted?: Permission[] } = {}) =>
  new SkillManagementCapability(
    { enabled: marketplaceEnabled } as never,
    createAssembleToolUseCase(),
    userContext as never,
    {
      execute: (query: HasPermissionQuery) =>
        Promise.resolve(
          query.orgId === TEST_ORG_ID &&
            query.role === UserRole.USER &&
            granted.includes(query.permission),
        ),
    } as never,
  );

const withCatalog = () =>
  aCapabilityContext({ skillCatalog: () => Promise.resolve(catalog) });

describe('SkillManagementCapability', () => {
  it('offers skill creation, editing and the marketplace tools', async () => {
    expect(
      toolNames(await buildCapability().contribute(withCatalog())),
    ).toEqual([
      ToolType.CREATE_SKILL,
      ToolType.EDIT_SKILL,
      ToolType.MARKETPLACE_SEARCH,
      ToolType.INSTALL_MARKETPLACE_SKILL,
    ]);
  });

  it('offers no skill editing without editable skills', async () => {
    expect(
      toolNames(await buildCapability().contribute(aCapabilityContext())),
    ).toEqual([
      ToolType.CREATE_SKILL,
      ToolType.MARKETPLACE_SEARCH,
      ToolType.INSTALL_MARKETPLACE_SKILL,
    ]);
  });

  it('offers no skill creation to members whose role may not manage skills', async () => {
    const capability = buildCapability({
      granted: [Permission.INSTALL_MARKETPLACE_SKILLS],
    });

    expect(toolNames(await capability.contribute(withCatalog()))).toEqual([
      ToolType.EDIT_SKILL,
      ToolType.MARKETPLACE_SEARCH,
      ToolType.INSTALL_MARKETPLACE_SKILL,
    ]);
  });

  it('offers no install card or install links to members whose role may not install Marketplace skills', async () => {
    const capability = buildCapability({ granted: [Permission.MANAGE_SKILLS] });

    expect(toolNames(await capability.contribute(withCatalog()))).toEqual([
      ToolType.CREATE_SKILL,
      ToolType.EDIT_SKILL,
    ]);
  });

  it('offers no marketplace tools when no marketplace is configured', async () => {
    const capability = buildCapability({ marketplaceEnabled: false });

    expect(toolNames(await capability.contribute(withCatalog()))).toEqual([
      ToolType.CREATE_SKILL,
      ToolType.EDIT_SKILL,
    ]);
  });

  it('offers nothing and does not load the catalog when the model cannot use tools', async () => {
    const skillCatalog = jest.fn().mockResolvedValue(catalog);

    expect(
      await buildCapability().contribute(
        aCapabilityContext({ canUseTools: false, skillCatalog }),
      ),
    ).toEqual({});
    expect(skillCatalog).not.toHaveBeenCalled();
  });
});
