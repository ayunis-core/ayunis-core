jest.mock('@nestjs-cls/transactional', () => ({
  Transactional: () => () => undefined,
}));

import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UpdateTeamMemberRoleUseCase } from './update-team-member-role.use-case';
import { UpdateTeamMemberRoleCommand } from './update-team-member-role.command';
import type { TeamsRepository } from 'src/iam/teams/application/ports/teams.repository';
import type { TeamMembersRepository } from 'src/iam/teams/application/ports/team-members.repository';
import type { TeamAccessService } from 'src/iam/teams/application/services/team-access.service';
import type { TeamRolePolicyService } from 'src/iam/teams/application/services/team-role-policy.service';
import { TeamAccess } from 'src/iam/teams/application/models/team-access.model';
import { TeamNotFoundError } from 'src/iam/teams/application/teams.errors';
import { TeamMemberNotFoundError } from 'src/iam/teams/application/team-members.errors';
import { Team } from 'src/iam/teams/domain/team.entity';
import { TeamMember } from 'src/iam/teams/domain/team-member.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

const orgId = randomUUID();
const actorId = randomUUID();
const team = new Team({ name: 'Planning', orgId });
const target = () =>
  new TeamMember({
    teamId: team.id,
    userId: randomUUID(),
    role: UserRole.USER,
  });

function createUseCase(options: { team?: Team | null; member?: TeamMember }) {
  const userContext: Record<string, unknown> = {
    userId: actorId,
    orgId,
    role: UserRole.USER,
    systemRole: SystemRole.CUSTOMER,
  };
  const access = new TeamAccess({
    teamRole: UserRole.ADMIN,
    orgPermissions: [],
    teamPermissions: [],
  });
  const teamsRepository = {
    findById: jest.fn().mockResolvedValue(options.team ?? null),
  };
  const teamMembersRepository = {
    findByTeamIdAndUserId: jest.fn().mockResolvedValue(options.member ?? null),
    updateRole: jest.fn().mockResolvedValue(undefined),
  };
  const teamAccessService = { forTeam: jest.fn().mockResolvedValue(access) };
  const policy = {
    assertMayChangeRole: jest.fn().mockResolvedValue(undefined),
  };
  const useCase = new UpdateTeamMemberRoleUseCase(
    teamsRepository as unknown as TeamsRepository,
    teamMembersRepository as unknown as TeamMembersRepository,
    teamAccessService as unknown as TeamAccessService,
    policy as unknown as TeamRolePolicyService,
    {
      get: jest.fn((key: string) => userContext[key]),
    } as unknown as ContextService,
  );
  return { useCase, teamMembersRepository, teamAccessService, policy, access };
}

const command = (member: TeamMember, role: UserRole) =>
  new UpdateTeamMemberRoleCommand({
    teamId: member.teamId,
    userId: member.userId,
    role,
  });

describe(UpdateTeamMemberRoleUseCase.name, () => {
  it('checks the policy with the actor access before updating the role', async () => {
    const member = target();
    const {
      useCase,
      teamMembersRepository,
      teamAccessService,
      policy,
      access,
    } = createUseCase({ team, member });

    const result = await useCase.execute(command(member, UserRole.ADMIN));

    expect(teamAccessService.forTeam).toHaveBeenCalledWith(
      expect.objectContaining({ userId: actorId, orgId }),
      team.id,
    );
    expect(policy.assertMayChangeRole).toHaveBeenCalledWith(
      access,
      member,
      UserRole.ADMIN,
    );
    expect(teamMembersRepository.updateRole).toHaveBeenCalledWith(
      team.id,
      member.userId,
      UserRole.ADMIN,
    );
    expect(result.role).toBe(UserRole.ADMIN);
  });

  it('does not update when the policy denies the change', async () => {
    const member = target();
    const { useCase, teamMembersRepository, policy } = createUseCase({
      team,
      member,
    });
    policy.assertMayChangeRole.mockRejectedValue(new UnauthorizedAccessError());

    await expect(
      useCase.execute(command(member, UserRole.ADMIN)),
    ).rejects.toThrow(UnauthorizedAccessError);
    expect(teamMembersRepository.updateRole).not.toHaveBeenCalled();
  });

  it('leaves an unchanged role untouched', async () => {
    const member = target();
    const { useCase, teamMembersRepository } = createUseCase({ team, member });

    await useCase.execute(command(member, UserRole.USER));

    expect(teamMembersRepository.updateRole).not.toHaveBeenCalled();
  });

  it('hides a team of another organisation', async () => {
    const member = target();
    const { useCase } = createUseCase({
      team: new Team({ name: 'Foreign', orgId: randomUUID() }),
      member,
    });

    await expect(
      useCase.execute(command(member, UserRole.ADMIN)),
    ).rejects.toThrow(TeamNotFoundError);
  });

  it('rejects a user who is not a member', async () => {
    const { useCase } = createUseCase({ team });

    await expect(
      useCase.execute(command(target(), UserRole.ADMIN)),
    ).rejects.toThrow(TeamMemberNotFoundError);
  });
});
