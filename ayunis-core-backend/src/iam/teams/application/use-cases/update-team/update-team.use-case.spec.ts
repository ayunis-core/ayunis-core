import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UpdateTeamUseCase } from './update-team.use-case';
import { UpdateTeamCommand } from './update-team.command';
import type { TeamsRepository } from 'src/iam/teams/application/ports/teams.repository';
import type { HasPermissionUseCase } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.use-case';
import { HasPermissionQuery } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.query';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { Team } from 'src/iam/teams/domain/team.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

const orgId = randomUUID();

function createUseCase(orgWideManageTeams: boolean) {
  const team = new Team({ name: 'Planning', orgId });
  const userContext: Record<string, unknown> = {
    userId: randomUUID(),
    orgId,
    role: UserRole.USER,
    systemRole: SystemRole.CUSTOMER,
  };
  const teamsRepository = {
    findById: jest.fn().mockResolvedValue(team),
    findByNameAndOrgId: jest.fn().mockResolvedValue(null),
    update: jest.fn((updated: Team) => Promise.resolve(updated)),
  };
  const hasPermission = {
    execute: jest.fn().mockResolvedValue(orgWideManageTeams),
  };
  const useCase = new UpdateTeamUseCase(
    teamsRepository as unknown as TeamsRepository,
    {
      get: jest.fn((key: string) => userContext[key]),
    } as unknown as ContextService,
    hasPermission as unknown as HasPermissionUseCase,
  );
  return { useCase, team, teamsRepository, hasPermission };
}

describe(UpdateTeamUseCase.name, () => {
  it('renames a team without an organisation-wide permission check', async () => {
    const { useCase, team, hasPermission } = createUseCase(false);

    const result = await useCase.execute(
      new UpdateTeamCommand(team.id, 'Renamed', team.modelOverrideEnabled),
    );

    expect(result.name).toBe('Renamed');
    expect(hasPermission.execute).not.toHaveBeenCalled();
  });

  it('requires organisation-wide team management to switch the model policy', async () => {
    const { useCase, team, teamsRepository } = createUseCase(false);

    await expect(
      useCase.execute(new UpdateTeamCommand(team.id, team.name, true)),
    ).rejects.toThrow(UnauthorizedAccessError);
    expect(teamsRepository.update).not.toHaveBeenCalled();
  });

  it('switches the model policy for an organisation-wide team manager', async () => {
    const { useCase, team, hasPermission } = createUseCase(true);

    const result = await useCase.execute(
      new UpdateTeamCommand(team.id, team.name, true),
    );

    expect(result.modelOverrideEnabled).toBe(true);
    expect(hasPermission.execute).toHaveBeenCalledWith(
      new HasPermissionQuery(orgId, UserRole.USER, Permission.MANAGE_TEAMS),
    );
  });
});
