import { randomUUID } from 'crypto';
import type { DescribeCollectiveOwnersUseCase } from 'src/domain/ownership/application/use-cases/describe-collective-owners/describe-collective-owners.use-case';
import type { GetOwnershipViewerUseCase } from 'src/domain/ownership/application/use-cases/get-ownership-viewer/get-ownership-viewer.use-case';
import { anOwnershipViewer } from 'src/domain/ownership/application/testing/ownership.fixtures';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { TeamAdminPermission } from 'src/iam/permissions/domain/value-objects/team-admin-permission.enum';
import { ListOwnerOptionsQuery } from './list-owner-options.query';
import { ListOwnerOptionsUseCase } from './list-owner-options.use-case';

const userId = randomUUID();
const orgId = randomUUID();

function setup(viewer = anOwnershipViewer({ userId, orgId })) {
  const describeOwners = { execute: jest.fn() };
  const useCase = new ListOwnerOptionsUseCase(
    {
      execute: jest.fn().mockResolvedValue(viewer),
    } as unknown as GetOwnershipViewerUseCase,
    describeOwners as unknown as DescribeCollectiveOwnersUseCase,
  );
  return { useCase, describeOwners };
}

describe(ListOwnerOptionsUseCase.name, () => {
  it('orders personal, teams by name, then the organisation', async () => {
    const bauamt = randomUUID();
    const buergerservice = randomUUID();
    const { useCase, describeOwners } = setup(
      anOwnershipViewer({
        userId,
        orgId,
        permissions: [
          Permission.MANAGE_OWN_SKILLS,
          Permission.MANAGE_ORG_SKILLS,
        ],
        adminTeamIds: [buergerservice, bauamt],
        teamAdminPermissions: [TeamAdminPermission.TEAM_MANAGE_SKILLS],
      }),
    );
    describeOwners.execute.mockResolvedValue({
      teams: new Map([
        [
          buergerservice,
          {
            teamId: buergerservice,
            name: 'Bürgerservice',
            memberCount: 34,
            editors: [],
          },
        ],
        [
          bauamt,
          { teamId: bauamt, name: 'Bauamt', memberCount: 14, editors: [] },
        ],
      ]),
      org: { memberCount: 186, editorsIncludeNonAdmins: true },
    });

    await expect(
      useCase.execute(new ListOwnerOptionsQuery('skill')),
    ).resolves.toEqual({
      options: [
        { type: 'personal' },
        {
          type: 'team',
          teamId: bauamt,
          teamName: 'Bauamt',
          memberCount: 14,
          editors: [],
        },
        {
          type: 'team',
          teamId: buergerservice,
          teamName: 'Bürgerservice',
          memberCount: 34,
          editors: [],
        },
        { type: 'org', memberCount: 186 },
      ],
      orgEditorsIncludeNonAdmins: true,
    });
  });

  it('offers nothing without any of the rights', async () => {
    const { useCase, describeOwners } = setup();
    describeOwners.execute.mockResolvedValue({ teams: new Map(), org: null });

    await expect(
      useCase.execute(new ListOwnerOptionsQuery('knowledge_base')),
    ).resolves.toEqual({ options: [], orgEditorsIncludeNonAdmins: false });
  });
});
