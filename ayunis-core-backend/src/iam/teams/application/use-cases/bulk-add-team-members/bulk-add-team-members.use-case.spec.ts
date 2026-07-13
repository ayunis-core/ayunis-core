import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { BulkAddTeamMembersUseCase } from './bulk-add-team-members.use-case';
import { BulkAddTeamMembersCommand } from './bulk-add-team-members.command';
import { AddTeamMemberUseCase } from '../add-team-member/add-team-member.use-case';
import { TeamMember } from '../../../domain/team-member.entity';
import { TeamNotFoundError } from '../../teams.errors';
import { UserAlreadyTeamMemberError } from '../../team-members.errors';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { UUID } from 'crypto';

describe('BulkAddTeamMembersUseCase', () => {
  let useCase: BulkAddTeamMembersUseCase;
  let mockAddTeamMemberUseCase: { execute: jest.Mock };

  const teamId = 'team-1' as UUID;
  const userA = 'user-a' as UUID;
  const userB = 'user-b' as UUID;

  const member = (userId: UUID) => new TeamMember({ teamId, userId });

  beforeAll(async () => {
    mockAddTeamMemberUseCase = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BulkAddTeamMembersUseCase,
        { provide: AddTeamMemberUseCase, useValue: mockAddTeamMemberUseCase },
      ],
    }).compile();

    useCase = module.get(BulkAddTeamMembersUseCase);
  });

  beforeEach(() => jest.clearAllMocks());

  it('adds every user and returns the created members', async () => {
    mockAddTeamMemberUseCase.execute
      .mockResolvedValueOnce(member(userA))
      .mockResolvedValueOnce(member(userB));

    const result = await useCase.execute(
      new BulkAddTeamMembersCommand({ teamId, userIds: [userA, userB] }),
    );

    expect(result).toHaveLength(2);
    expect(mockAddTeamMemberUseCase.execute).toHaveBeenCalledTimes(2);
  });

  it('deduplicates repeated user ids', async () => {
    mockAddTeamMemberUseCase.execute.mockResolvedValue(member(userA));

    await useCase.execute(
      new BulkAddTeamMembersCommand({ teamId, userIds: [userA, userA] }),
    );

    expect(mockAddTeamMemberUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it('skips per-user failures and returns only the successful ones', async () => {
    mockAddTeamMemberUseCase.execute
      .mockRejectedValueOnce(new UserAlreadyTeamMemberError(teamId, userA))
      .mockResolvedValueOnce(member(userB));

    const result = await useCase.execute(
      new BulkAddTeamMembersCommand({ teamId, userIds: [userA, userB] }),
    );

    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe(userB);
  });

  it('fails the whole request when the team is not found', async () => {
    mockAddTeamMemberUseCase.execute.mockRejectedValueOnce(
      new TeamNotFoundError(teamId),
    );

    await expect(
      useCase.execute(
        new BulkAddTeamMembersCommand({ teamId, userIds: [userA, userB] }),
      ),
    ).rejects.toBeInstanceOf(TeamNotFoundError);
  });

  it('propagates non-per-user errors instead of skipping them', async () => {
    mockAddTeamMemberUseCase.execute.mockRejectedValueOnce(
      new UnauthorizedAccessError(),
    );

    await expect(
      useCase.execute(
        new BulkAddTeamMembersCommand({ teamId, userIds: [userA, userB] }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedAccessError);
  });

  it('re-throws unexpected (non-ApplicationError) faults raw, without wrapping (no metadata leak)', async () => {
    const fault = new Error('database is on fire');
    mockAddTeamMemberUseCase.execute.mockRejectedValueOnce(fault);

    await expect(
      useCase.execute(
        new BulkAddTeamMembersCommand({ teamId, userIds: [userA] }),
      ),
    ).rejects.toBe(fault);
  });
});
