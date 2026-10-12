import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { BulkAddTeamMembersUseCase } from './bulk-add-team-members.use-case';
import { BulkAddTeamMembersCommand } from './bulk-add-team-members.command';
import { TeamMemberCreationService } from 'src/iam/teams/application/services/team-member-creation.service';
import { AssertTeamManagementAllowedUseCase } from 'src/iam/teams/application/use-cases/assert-team-management-allowed/assert-team-management-allowed.use-case';
import { ContextService } from 'src/common/context/services/context.service';
import { TeamMember } from 'src/iam/teams/domain/team-member.entity';
import { TeamNotFoundError } from 'src/iam/teams/application/teams.errors';
import {
  UnexpectedTeamMemberError,
  UserAlreadyTeamMemberError,
} from 'src/iam/teams/application/team-members.errors';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { UUID } from 'crypto';

describe('BulkAddTeamMembersUseCase', () => {
  let useCase: BulkAddTeamMembersUseCase;
  let mockCreateMember: { add: jest.Mock };

  const teamId = 'team-1' as UUID;
  const userA = 'user-a' as UUID;
  const userB = 'user-b' as UUID;

  const member = (userId: UUID) => new TeamMember({ teamId, userId });

  beforeAll(async () => {
    mockCreateMember = { add: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BulkAddTeamMembersUseCase,
        {
          provide: ContextService,
          useValue: { get: () => '11111111-1111-4111-8111-111111111111' },
        },
        {
          provide: AssertTeamManagementAllowedUseCase,
          useValue: { execute: jest.fn().mockResolvedValue(undefined) },
        },
        { provide: TeamMemberCreationService, useValue: mockCreateMember },
      ],
    }).compile();

    useCase = module.get(BulkAddTeamMembersUseCase);
  });

  beforeEach(() => jest.clearAllMocks());

  it('adds every user and returns the created members', async () => {
    mockCreateMember.add
      .mockResolvedValueOnce(member(userA))
      .mockResolvedValueOnce(member(userB));

    const result = await useCase.execute(
      new BulkAddTeamMembersCommand({ teamId, userIds: [userA, userB] }),
    );

    expect(result).toHaveLength(2);
    expect(mockCreateMember.add).toHaveBeenCalledTimes(2);
  });

  it('deduplicates repeated user ids', async () => {
    mockCreateMember.add.mockResolvedValue(member(userA));

    await useCase.execute(
      new BulkAddTeamMembersCommand({ teamId, userIds: [userA, userA] }),
    );

    expect(mockCreateMember.add).toHaveBeenCalledTimes(1);
  });

  it('skips per-user failures and returns only the successful ones', async () => {
    mockCreateMember.add
      .mockRejectedValueOnce(new UserAlreadyTeamMemberError(teamId, userA))
      .mockResolvedValueOnce(member(userB));

    const result = await useCase.execute(
      new BulkAddTeamMembersCommand({ teamId, userIds: [userA, userB] }),
    );

    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe(userB);
  });

  it('fails the whole request when the team is not found', async () => {
    mockCreateMember.add.mockRejectedValueOnce(new TeamNotFoundError(teamId));

    await expect(
      useCase.execute(
        new BulkAddTeamMembersCommand({ teamId, userIds: [userA, userB] }),
      ),
    ).rejects.toBeInstanceOf(TeamNotFoundError);
  });

  it('propagates non-per-user errors instead of skipping them', async () => {
    mockCreateMember.add.mockRejectedValueOnce(new UnauthorizedAccessError());

    await expect(
      useCase.execute(
        new BulkAddTeamMembersCommand({ teamId, userIds: [userA, userB] }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedAccessError);
  });

  it('wraps unexpected faults while omitting their details from the client response', async () => {
    const fault = new Error('database is on fire');
    mockCreateMember.add.mockRejectedValueOnce(fault);

    const result = useCase.execute(
      new BulkAddTeamMembersCommand({ teamId, userIds: [userA] }),
    );
    await expect(result).rejects.toBeInstanceOf(UnexpectedTeamMemberError);
    await result.catch((error: UnexpectedTeamMemberError) => {
      expect(error.toClientResponse()).toEqual({
        code: 'UNEXPECTED_TEAM_MEMBER_ERROR',
        message: 'Internal server error',
      });
    });
  });
});
