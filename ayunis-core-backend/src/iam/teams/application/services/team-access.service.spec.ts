import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import type { HasPermissionUseCase } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.use-case';
import type { HasPermissionQuery } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.query';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import type { TeamMembersRepository } from 'src/iam/teams/application/ports/team-members.repository';
import { TeamAccessDeniedError } from 'src/iam/teams/application/team-members.errors';
import { TeamMember } from 'src/iam/teams/domain/team-member.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import type { GetTeamAdminPermissionsUseCase } from 'src/iam/permissions/application/use-cases/get-team-admin-permissions/get-team-admin-permissions.use-case';
import { TeamAdminPermission } from 'src/iam/permissions/domain/value-objects/team-admin-permission.enum';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { ALL_TEAMS, TeamAccessService } from './team-access.service';

describe('TeamAccessService', () => {
  const userId = randomUUID();
  const orgId = randomUUID();
  const teamId = randomUUID();
  let granted: Permission[];
  let role: UserRole;
  let member: TeamMember | null;
  let adminTeamIds: UUID[];
  let teamAdminRights: TeamAdminPermission[];
  let service: TeamAccessService;

  beforeEach(() => {
    granted = [];
    role = UserRole.USER;
    member = null;
    adminTeamIds = [];
    teamAdminRights = Object.values(TeamAdminPermission);
    const context = {
      get: jest.fn((key: string) => {
        const values: Record<string, unknown> = {
          userId,
          orgId,
          role,
          systemRole: SystemRole.CUSTOMER,
        };
        return values[key];
      }),
    } as unknown as ContextService;
    const hasPermission = {
      execute: jest.fn((query: HasPermissionQuery) =>
        Promise.resolve(
          query.role === UserRole.ADMIN || granted.includes(query.permission),
        ),
      ),
    } as unknown as HasPermissionUseCase;
    const teamMembers = {
      findByTeamIdAndUserId: jest.fn(() => Promise.resolve(member)),
      findAdminTeamIdsByUserId: jest.fn(() => Promise.resolve(adminTeamIds)),
    } as unknown as TeamMembersRepository;
    const getTeamAdminPermissions = {
      execute: jest.fn(() => Promise.resolve(teamAdminRights)),
    } as unknown as GetTeamAdminPermissionsUseCase;
    service = new TeamAccessService(
      hasPermission,
      teamMembers,
      getTeamAdminPermissions,
      context,
    );
  });

  const teamAdmin = () => new TeamMember({ teamId, userId, isTeamAdmin: true });

  describe('manageableTeamIds', () => {
    it('returns every team for holders of a team permission', async () => {
      granted = [Permission.ASSIGN_USERS_TO_TEAMS];

      await expect(service.manageableTeamIds()).resolves.toBe(ALL_TEAMS);
    });

    it('returns only the administered teams for team admins', async () => {
      adminTeamIds = [teamId];

      await expect(service.manageableTeamIds()).resolves.toEqual([teamId]);
    });
  });

  describe('assertCanManageMembers', () => {
    it('denies a plain member', async () => {
      member = new TeamMember({ teamId, userId });

      await expect(service.assertCanManageMembers({ teamId })).rejects.toThrow(
        TeamAccessDeniedError,
      );
    });

    it('allows a team admin of the team', async () => {
      member = teamAdmin();

      await expect(
        service.assertCanManageMembers({ teamId }),
      ).resolves.toBeUndefined();
    });

    it('denies a team admin while team admins may not manage members', async () => {
      member = teamAdmin();
      teamAdminRights = [TeamAdminPermission.TEAM_APPOINT_ADMINS];

      await expect(service.assertCanManageMembers({ teamId })).rejects.toThrow(
        TeamAccessDeniedError,
      );
    });

    it('keeps role rights for team admins without the team right', async () => {
      member = teamAdmin();
      teamAdminRights = [];
      granted = [Permission.ASSIGN_USERS_TO_TEAMS];

      await expect(
        service.assertCanManageMembers({ teamId }),
      ).resolves.toBeUndefined();
    });

    it('allows holders of assign_users_to_teams in every team', async () => {
      granted = [Permission.ASSIGN_USERS_TO_TEAMS];

      await expect(
        service.assertCanManageMembers({ teamId }),
      ).resolves.toBeUndefined();
    });

    it('does not count manage_teams as member management', async () => {
      granted = [Permission.MANAGE_TEAMS];

      await expect(service.assertCanManageMembers({ teamId })).rejects.toThrow(
        TeamAccessDeniedError,
      );
    });

    it('leaves super-admin calls for another org to their own guard', async () => {
      await expect(
        service.assertCanManageMembers({ teamId, targetOrgId: randomUUID() }),
      ).resolves.toBeUndefined();
    });
  });

  describe('assertCanAppointAdmins', () => {
    it('allows holders of manage_teams', async () => {
      granted = [Permission.MANAGE_TEAMS];

      await expect(
        service.assertCanAppointAdmins({ teamId }),
      ).resolves.toBeUndefined();
    });

    it('denies a team admin while team admins may not appoint team admins', async () => {
      member = teamAdmin();
      teamAdminRights = [TeamAdminPermission.TEAM_MANAGE_MEMBERS];

      await expect(service.assertCanAppointAdmins({ teamId })).rejects.toThrow(
        TeamAccessDeniedError,
      );
    });

    it('lets a team admin without any right still view the team', async () => {
      member = teamAdmin();
      teamAdminRights = [];

      await expect(service.assertCanView({ teamId })).resolves.toBeUndefined();
    });

    it('denies holders of only assign_users_to_teams', async () => {
      granted = [Permission.ASSIGN_USERS_TO_TEAMS];

      await expect(service.assertCanAppointAdmins({ teamId })).rejects.toThrow(
        TeamAccessDeniedError,
      );
    });
  });

  describe('mayChangeLastTeamAdmin', () => {
    it('is reserved for organization admins', () => {
      expect(service.mayChangeLastTeamAdmin()).toBe(false);

      role = UserRole.ADMIN;

      expect(service.mayChangeLastTeamAdmin()).toBe(true);
    });
  });
});
