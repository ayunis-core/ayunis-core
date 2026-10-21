import { randomUUID } from 'crypto';
import type { TeamAdminPermissionsRepository } from 'src/iam/permissions/application/ports/team-admin-permissions.repository';
import { TeamAdminPermission } from 'src/iam/permissions/domain/value-objects/team-admin-permission.enum';
import { GetTeamAdminPermissionsUseCase } from './get-team-admin-permissions.use-case';

describe('GetTeamAdminPermissionsUseCase', () => {
  it('returns the granted rights in catalog order', async () => {
    const useCase = new GetTeamAdminPermissionsUseCase({
      findByOrgId: () =>
        Promise.resolve([
          TeamAdminPermission.TEAM_SHARE_WORKSPACES,
          TeamAdminPermission.TEAM_MANAGE_MEMBERS,
        ]),
    } as unknown as TeamAdminPermissionsRepository);

    await expect(useCase.execute(randomUUID())).resolves.toEqual([
      TeamAdminPermission.TEAM_MANAGE_MEMBERS,
      TeamAdminPermission.TEAM_SHARE_WORKSPACES,
    ]);
  });
});
