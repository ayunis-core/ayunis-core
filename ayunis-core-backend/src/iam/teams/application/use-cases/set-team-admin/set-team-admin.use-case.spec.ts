jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _prop: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import type { TeamMembersRepository } from 'src/iam/teams/application/ports/team-members.repository';
import type { LastTeamAdminPolicy } from 'src/iam/teams/application/services/last-team-admin-policy.service';
import type { TeamAccessService } from 'src/iam/teams/application/services/team-access.service';
import {
  LastTeamAdminError,
  TeamAccessDeniedError,
  TeamMemberNotFoundError,
} from 'src/iam/teams/application/team-members.errors';
import type { AssertTeamManagementAllowedUseCase } from 'src/iam/teams/application/use-cases/assert-team-management-allowed/assert-team-management-allowed.use-case';
import type { GetTeamUseCase } from 'src/iam/teams/application/use-cases/get-team/get-team.use-case';
import { TeamMember } from 'src/iam/teams/domain/team-member.entity';
import { SetTeamAdminCommand } from './set-team-admin.command';
import { SetTeamAdminUseCase } from './set-team-admin.use-case';

describe('SetTeamAdminUseCase', () => {
  const orgId = randomUUID();
  const teamId = randomUUID();
  const userId = randomUUID();
  let member: TeamMember | null;
  let teamAccess: { assertCanAppointAdmins: jest.Mock };
  let lastTeamAdmin: { assertMayLoseAdmin: jest.Mock };
  let repository: { findByTeamIdAndUserId: jest.Mock; setTeamAdmin: jest.Mock };
  let useCase: SetTeamAdminUseCase;

  beforeEach(() => {
    member = new TeamMember({ teamId, userId });
    teamAccess = { assertCanAppointAdmins: jest.fn() };
    lastTeamAdmin = { assertMayLoseAdmin: jest.fn() };
    repository = {
      findByTeamIdAndUserId: jest.fn(() => Promise.resolve(member)),
      setTeamAdmin: jest.fn(),
    };
    useCase = new SetTeamAdminUseCase(
      { execute: jest.fn() } as unknown as AssertTeamManagementAllowedUseCase,
      teamAccess as unknown as TeamAccessService,
      lastTeamAdmin as unknown as LastTeamAdminPolicy,
      { execute: jest.fn() } as unknown as GetTeamUseCase,
      repository as unknown as TeamMembersRepository,
      { get: jest.fn(() => orgId) } as unknown as ContextService,
    );
  });

  const command = (isTeamAdmin: boolean) =>
    new SetTeamAdminCommand({ teamId, userId, isTeamAdmin });

  it('makes a member team admin', async () => {
    const result = await useCase.execute(command(true));

    expect(repository.setTeamAdmin).toHaveBeenCalledWith(teamId, userId, true);
    expect(result.isTeamAdmin).toBe(true);
  });

  it('is idempotent for a member who already has the role', async () => {
    member = new TeamMember({ teamId, userId, isTeamAdmin: true });

    await useCase.execute(command(true));

    expect(repository.setTeamAdmin).not.toHaveBeenCalled();
  });

  it('checks the last-team-admin rule before demoting', async () => {
    member = new TeamMember({ teamId, userId, isTeamAdmin: true });
    lastTeamAdmin.assertMayLoseAdmin.mockRejectedValue(
      new LastTeamAdminError(teamId, userId),
    );

    await expect(useCase.execute(command(false))).rejects.toThrow(
      LastTeamAdminError,
    );
    expect(repository.setTeamAdmin).not.toHaveBeenCalled();
  });

  it('rejects callers who may not appoint team admins', async () => {
    teamAccess.assertCanAppointAdmins.mockRejectedValue(
      new TeamAccessDeniedError(teamId),
    );

    await expect(useCase.execute(command(true))).rejects.toThrow(
      TeamAccessDeniedError,
    );
    expect(repository.setTeamAdmin).not.toHaveBeenCalled();
  });

  it('only appoints existing members', async () => {
    member = null;

    await expect(useCase.execute(command(true))).rejects.toThrow(
      TeamMemberNotFoundError,
    );
  });
});
