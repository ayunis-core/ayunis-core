import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import {
  aUserContext,
  getFromUserContext,
} from 'src/common/context/testing/context.fixtures';
import type { HasPermissionUseCase } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.use-case';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { TeamAccess } from 'src/iam/teams/application/models/team-access.model';
import type { TeamMembersRepository } from 'src/iam/teams/application/ports/team-members.repository';
import type { TeamAccessService } from 'src/iam/teams/application/services/team-access.service';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { GetCollectiveOwnerAccessQuery } from './get-collective-owner-access.query';
import { GetCollectiveOwnerAccessUseCase } from './get-collective-owner-access.use-case';

const permissions = {
  manage: Permission.MANAGE_SKILLS,
  team: Permission.SHARE_SKILLS_WITH_TEAMS,
  org: Permission.SHARE_SKILLS_WITH_ORG,
};

function teamAccess(params: {
  teamRole: UserRole | null;
  orgPermissions?: Permission[];
  teamPermissions?: Permission[];
}): TeamAccess {
  return new TeamAccess({
    teamRole: params.teamRole,
    orgPermissions: params.orgPermissions ?? [],
    teamPermissions: params.teamPermissions ?? [],
  });
}

function setup() {
  const user = aUserContext({ userId: randomUUID(), orgId: randomUUID() });
  const teamId = randomUUID();
  const teamAccessService = {
    forTeam: jest.fn().mockResolvedValue(teamAccess({ teamRole: null })),
  };
  const teamMembers = {
    isMemberInOrg: jest.fn().mockResolvedValue(true),
  };
  const hasPermission = { execute: jest.fn().mockResolvedValue(false) };
  const useCase = new GetCollectiveOwnerAccessUseCase(
    teamAccessService as unknown as TeamAccessService,
    teamMembers as unknown as TeamMembersRepository,
    hasPermission as unknown as HasPermissionUseCase,
    { get: jest.fn(getFromUserContext(user)) } as unknown as ContextService,
  );
  const team = (id = teamId) =>
    useCase.execute(
      new GetCollectiveOwnerAccessQuery(
        { type: 'team', teamId: id },
        permissions,
      ),
    );
  const org = (orgId = user.orgId) =>
    useCase.execute(
      new GetCollectiveOwnerAccessQuery({ type: 'org', orgId }, permissions),
    );
  const readTeam = () =>
    useCase.execute(
      new GetCollectiveOwnerAccessQuery({ type: 'team', teamId }),
    );
  const readOrg = (orgId = user.orgId) =>
    useCase.execute(new GetCollectiveOwnerAccessQuery({ type: 'org', orgId }));
  return {
    user,
    teamId,
    teamAccessService,
    teamMembers,
    hasPermission,
    team,
    org,
    readTeam,
    readOrg,
  };
}

describe(GetCollectiveOwnerAccessUseCase.name, () => {
  describe('team owner', () => {
    it('denies everything to users outside the team', async () => {
      const { team } = setup();

      await expect(team()).resolves.toEqual({
        canRead: false,
        canManage: false,
      });
    });

    it('denies non-members even with org-wide permission', async () => {
      const { team, teamAccessService } = setup();
      teamAccessService.forTeam.mockResolvedValue(
        teamAccess({ teamRole: null, orgPermissions: [permissions.team] }),
      );

      await expect(team()).resolves.toEqual({
        canRead: false,
        canManage: false,
      });
    });

    it('lets members read but not manage without the team permission', async () => {
      const { team, teamAccessService, user, teamId } = setup();
      teamAccessService.forTeam.mockResolvedValue(
        teamAccess({
          teamRole: UserRole.USER,
          orgPermissions: [Permission.SHARE_KNOWLEDGE_BASES_WITH_TEAMS],
        }),
      );

      await expect(team()).resolves.toEqual({
        canRead: true,
        canManage: false,
      });
      expect(teamAccessService.forTeam).toHaveBeenCalledWith(
        { userId: user.userId, orgId: user.orgId, role: user.role },
        teamId,
      );
    });

    it('lets members with the permission from their org role manage', async () => {
      const { team, teamAccessService } = setup();
      teamAccessService.forTeam.mockResolvedValue(
        teamAccess({
          teamRole: UserRole.USER,
          orgPermissions: [permissions.manage, permissions.team],
        }),
      );

      await expect(team()).resolves.toEqual({ canRead: true, canManage: true });
    });

    it('requires the org-wide manage permission besides the team permission', async () => {
      const { team, teamAccessService } = setup();
      teamAccessService.forTeam.mockResolvedValue(
        teamAccess({
          teamRole: UserRole.ADMIN,
          teamPermissions: Object.values(Permission),
        }),
      );

      await expect(team()).resolves.toEqual({
        canRead: true,
        canManage: false,
      });
    });

    it('resolves read access from the membership alone', async () => {
      const { readTeam, teamMembers, teamAccessService, user, teamId } =
        setup();
      teamMembers.isMemberInOrg.mockResolvedValue(false);

      await expect(readTeam()).resolves.toEqual({
        canRead: false,
        canManage: false,
      });

      teamMembers.isMemberInOrg.mockResolvedValue(true);
      await expect(readTeam()).resolves.toEqual({
        canRead: true,
        canManage: false,
      });
      expect(teamMembers.isMemberInOrg).toHaveBeenCalledWith(
        teamId,
        user.userId,
        user.orgId,
      );
      expect(teamAccessService.forTeam).not.toHaveBeenCalled();
    });

    it('denies a team of another organization even to its members', async () => {
      const { team, readTeam, teamMembers, teamAccessService } = setup();
      teamMembers.isMemberInOrg.mockResolvedValue(false);
      teamAccessService.forTeam.mockResolvedValue(
        teamAccess({
          teamRole: UserRole.ADMIN,
          orgPermissions: [permissions.manage],
          teamPermissions: Object.values(Permission),
        }),
      );

      for (const access of [team, readTeam]) {
        await expect(access()).resolves.toEqual({
          canRead: false,
          canManage: false,
        });
      }
    });

    it('lets team admins manage through their team role', async () => {
      const { team, teamAccessService } = setup();
      teamAccessService.forTeam.mockResolvedValue(
        teamAccess({
          teamRole: UserRole.ADMIN,
          orgPermissions: [permissions.manage],
          teamPermissions: Object.values(Permission),
        }),
      );

      await expect(team()).resolves.toEqual({ canRead: true, canManage: true });
    });
  });

  describe('organization owner', () => {
    it('denies everything for another organization', async () => {
      const { org, hasPermission } = setup();
      hasPermission.execute.mockResolvedValue(true);

      await expect(org(randomUUID())).resolves.toEqual({
        canRead: false,
        canManage: false,
      });
      expect(hasPermission.execute).not.toHaveBeenCalled();
    });

    it('lets members read and requires the org permission to manage', async () => {
      const { org, hasPermission, user } = setup();

      await expect(org()).resolves.toEqual({ canRead: true, canManage: false });

      hasPermission.execute.mockResolvedValue(true);
      await expect(org()).resolves.toEqual({ canRead: true, canManage: true });
      for (const permission of [permissions.manage, permissions.org]) {
        expect(hasPermission.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            orgId: user.orgId,
            role: user.role,
            permission,
          }),
        );
      }
    });

    it('requires the manage permission besides the org permission', async () => {
      const { org, hasPermission } = setup();
      hasPermission.execute.mockImplementation(
        ({ permission }: { permission: Permission }) =>
          Promise.resolve(permission === permissions.org),
      );

      await expect(org()).resolves.toEqual({ canRead: true, canManage: false });
    });

    it('resolves read access without loading permissions', async () => {
      const { readOrg, hasPermission } = setup();

      await expect(readOrg()).resolves.toEqual({
        canRead: true,
        canManage: false,
      });
      await expect(readOrg(randomUUID())).resolves.toEqual({
        canRead: false,
        canManage: false,
      });
      expect(hasPermission.execute).not.toHaveBeenCalled();
    });
  });
});
