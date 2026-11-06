jest.mock('@nestjs-cls/transactional', () => ({
  Transactional: () => () => undefined,
}));

import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { RemoveTeamMemberUseCase } from './remove-team-member.use-case';
import { RemoveTeamMemberCommand } from './remove-team-member.command';
import type { TeamsRepository } from 'src/iam/teams/application/ports/teams.repository';
import type { TeamMembersRepository } from 'src/iam/teams/application/ports/team-members.repository';
import type { TeamAccessService } from 'src/iam/teams/application/services/team-access.service';
import type { TeamRolePolicyService } from 'src/iam/teams/application/services/team-role-policy.service';
import { TeamAccess } from 'src/iam/teams/application/models/team-access.model';
import { TeamLastAdminError } from 'src/iam/teams/application/team-members.errors';
import { Team } from 'src/iam/teams/domain/team.entity';
import { TeamMember } from 'src/iam/teams/domain/team-member.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

const orgId = randomUUID();
const team = new Team({ name: 'Planning', orgId });
const member = new TeamMember({
  teamId: team.id,
  userId: randomUUID(),
  role: UserRole.ADMIN,
});

function createUseCase(systemRole: SystemRole) {
  const userContext: Record<string, unknown> = {
    userId: randomUUID(),
    orgId,
    role: UserRole.USER,
    systemRole,
  };
  const access = new TeamAccess({
    teamRole: UserRole.ADMIN,
    orgPermissions: [],
    teamPermissions: [],
  });
  const teamMembersRepository = {
    findByTeamIdAndUserId: jest.fn().mockResolvedValue(member),
    deleteByTeamIdAndUserId: jest.fn().mockResolvedValue(undefined),
  };
  const teamAccessService = { forTeam: jest.fn().mockResolvedValue(access) };
  const policy = { assertMayRemove: jest.fn().mockResolvedValue(undefined) };
  const useCase = new RemoveTeamMemberUseCase(
    {
      findById: jest.fn().mockResolvedValue(team),
    } as unknown as TeamsRepository,
    teamMembersRepository as unknown as TeamMembersRepository,
    {
      get: jest.fn((key: string) => userContext[key]),
    } as unknown as ContextService,
    teamAccessService as unknown as TeamAccessService,
    policy as unknown as TeamRolePolicyService,
  );
  return { useCase, teamMembersRepository, policy, access };
}

describe(RemoveTeamMemberUseCase.name, () => {
  it('checks the removal policy for an organisation user', async () => {
    const { useCase, teamMembersRepository, policy, access } = createUseCase(
      SystemRole.CUSTOMER,
    );

    await useCase.execute(
      new RemoveTeamMemberCommand({ teamId: team.id, userId: member.userId }),
    );

    expect(policy.assertMayRemove).toHaveBeenCalledWith(access, member);
    expect(teamMembersRepository.deleteByTeamIdAndUserId).toHaveBeenCalled();
  });

  it('keeps the member when the policy denies the removal', async () => {
    const { useCase, teamMembersRepository, policy } = createUseCase(
      SystemRole.CUSTOMER,
    );
    policy.assertMayRemove.mockRejectedValue(new TeamLastAdminError(team.id));

    await expect(
      useCase.execute(
        new RemoveTeamMemberCommand({ teamId: team.id, userId: member.userId }),
      ),
    ).rejects.toThrow(TeamLastAdminError);
    expect(
      teamMembersRepository.deleteByTeamIdAndUserId,
    ).not.toHaveBeenCalled();
  });

  it('skips the team policy on the super-admin route', async () => {
    const { useCase, teamMembersRepository, policy } = createUseCase(
      SystemRole.SUPER_ADMIN,
    );

    await useCase.execute(
      new RemoveTeamMemberCommand({
        orgId,
        teamId: team.id,
        userId: member.userId,
      }),
    );

    expect(policy.assertMayRemove).not.toHaveBeenCalled();
    expect(teamMembersRepository.deleteByTeamIdAndUserId).toHaveBeenCalled();
  });
});
