import { randomUUID } from 'crypto';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { TeamRolePolicyService } from './team-role-policy.service';
import type { TeamMembersRepository } from 'src/iam/teams/application/ports/team-members.repository';
import { TeamAccess } from 'src/iam/teams/application/models/team-access.model';
import { TeamLastAdminError } from 'src/iam/teams/application/team-members.errors';
import { TeamMember } from 'src/iam/teams/domain/team-member.entity';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

const teamId = randomUUID();

const teamAdmin = new TeamAccess({
  teamRole: UserRole.ADMIN,
  orgPermissions: [],
  teamPermissions: Object.values(Permission),
});
const teamManager = new TeamAccess({
  teamRole: UserRole.MANAGER,
  orgPermissions: [],
  teamPermissions: [Permission.ASSIGN_USERS_TO_TEAMS],
});
const orgAssigner = new TeamAccess({
  teamRole: null,
  orgPermissions: [Permission.ASSIGN_USERS_TO_TEAMS],
  teamPermissions: [],
});

const member = (role: UserRole) =>
  new TeamMember({ teamId, userId: randomUUID(), role });

function createPolicy(adminCount: number) {
  const repository = {
    countByTeamIdAndRole: jest.fn().mockResolvedValue(adminCount),
  };
  return {
    policy: new TeamRolePolicyService(
      repository as unknown as TeamMembersRepository,
    ),
    repository,
  };
}

describe(TeamRolePolicyService.name, () => {
  describe('assertMayChangeRole', () => {
    it('lets a team admin promote a member', async () => {
      const { policy } = createPolicy(1);

      await expect(
        policy.assertMayChangeRole(
          teamAdmin,
          member(UserRole.USER),
          UserRole.ADMIN,
        ),
      ).resolves.toBeUndefined();
    });

    it('denies a team manager changing roles', async () => {
      const { policy } = createPolicy(1);

      await expect(
        policy.assertMayChangeRole(
          teamManager,
          member(UserRole.USER),
          UserRole.MANAGER,
        ),
      ).rejects.toThrow(UnauthorizedAccessError);
    });

    it('stops a team admin demoting the last admin', async () => {
      const { policy } = createPolicy(1);

      await expect(
        policy.assertMayChangeRole(
          teamAdmin,
          member(UserRole.ADMIN),
          UserRole.USER,
        ),
      ).rejects.toThrow(TeamLastAdminError);
    });

    it('lets a team admin demote an admin while another remains', async () => {
      const { policy } = createPolicy(2);

      await expect(
        policy.assertMayChangeRole(
          teamAdmin,
          member(UserRole.ADMIN),
          UserRole.MANAGER,
        ),
      ).resolves.toBeUndefined();
    });

    it('lets an organisation-wide assigner demote the last admin', async () => {
      const { policy, repository } = createPolicy(1);

      await expect(
        policy.assertMayChangeRole(
          orgAssigner,
          member(UserRole.ADMIN),
          UserRole.USER,
        ),
      ).resolves.toBeUndefined();
      expect(repository.countByTeamIdAndRole).not.toHaveBeenCalled();
    });
  });

  describe('assertMayRemove', () => {
    it('lets a team manager remove an ordinary member', async () => {
      const { policy } = createPolicy(1);

      await expect(
        policy.assertMayRemove(teamManager, member(UserRole.MANAGER)),
      ).resolves.toBeUndefined();
    });

    it('denies a team manager removing a team admin', async () => {
      const { policy } = createPolicy(2);

      await expect(
        policy.assertMayRemove(teamManager, member(UserRole.ADMIN)),
      ).rejects.toThrow(UnauthorizedAccessError);
    });

    it('stops a team admin removing the last admin', async () => {
      const { policy } = createPolicy(1);

      await expect(
        policy.assertMayRemove(teamAdmin, member(UserRole.ADMIN)),
      ).rejects.toThrow(TeamLastAdminError);
    });

    it('lets an organisation-wide assigner remove the last admin', async () => {
      const { policy } = createPolicy(1);

      await expect(
        policy.assertMayRemove(orgAssigner, member(UserRole.ADMIN)),
      ).resolves.toBeUndefined();
    });
  });
});
