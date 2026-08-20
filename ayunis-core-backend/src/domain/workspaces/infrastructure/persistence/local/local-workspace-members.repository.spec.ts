import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { LocalWorkspaceMembersRepository } from './local-workspace-members.repository';
import { WorkspaceMemberRecord } from './schema/workspace-member.record';
import { WorkspaceRecord } from './schema/workspace.record';
import { WorkspaceMemberMapper } from './mappers/workspace-member.mapper';
import { WorkspaceMemberStatus } from 'src/domain/workspaces/domain/value-objects/workspace-member-status.enum';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import {
  TEST_ORG_ID,
  TEST_USER_ID,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';

describe('LocalWorkspaceMembersRepository', () => {
  const workspaceRepo = { findOne: jest.fn() };
  const memberRepo = {
    findOne: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  let repository: LocalWorkspaceMembersRepository;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        LocalWorkspaceMembersRepository,
        WorkspaceMemberMapper,
        {
          provide: getRepositoryToken(WorkspaceRecord),
          useValue: workspaceRepo,
        },
        {
          provide: getRepositoryToken(WorkspaceMemberRecord),
          useValue: memberRepo,
        },
      ],
    }).compile();
    repository = module.get(LocalWorkspaceMembersRepository);
  });

  it('atomically creates a direct workspace member', async () => {
    memberRepo.insert.mockResolvedValue({ identifiers: [] });
    const member = {
      workspaceId: TEST_WORKSPACE_ID,
      userId: TEST_USER_ID,
      role: WorkspaceRole.EDIT,
      status: WorkspaceMemberStatus.PENDING,
    };

    await expect(repository.createMember(member)).resolves.toEqual(member);
    expect(memberRepo.insert).toHaveBeenCalledWith(
      expect.objectContaining({ id: expect.any(String), ...member }),
    );
  });

  it('does not recreate an invitation deleted before activation', async () => {
    workspaceRepo.findOne.mockResolvedValue({ id: TEST_WORKSPACE_ID });
    memberRepo.findOne.mockResolvedValue({
      workspaceId: TEST_WORKSPACE_ID,
      userId: TEST_USER_ID,
      role: WorkspaceRole.EDIT,
      status: WorkspaceMemberStatus.PENDING,
    });
    memberRepo.update.mockResolvedValue({ affected: 0 });

    await expect(
      repository.activateInvitation(
        TEST_WORKSPACE_ID,
        TEST_USER_ID,
        TEST_ORG_ID,
      ),
    ).resolves.toBeNull();
  });

  it('only finds invitations through a workspace in the caller organization', async () => {
    workspaceRepo.findOne.mockResolvedValue(null);

    await expect(
      repository.findInvitation(TEST_WORKSPACE_ID, TEST_USER_ID, TEST_ORG_ID),
    ).resolves.toBeNull();
    expect(memberRepo.findOne).not.toHaveBeenCalled();
  });

  it('does not decline a membership accepted concurrently', async () => {
    workspaceRepo.findOne.mockResolvedValue({ id: TEST_WORKSPACE_ID });
    memberRepo.delete.mockResolvedValue({ affected: 0 });

    await expect(
      repository.declineInvitation(
        TEST_WORKSPACE_ID,
        TEST_USER_ID,
        TEST_ORG_ID,
      ),
    ).resolves.toBe(false);
    expect(memberRepo.delete).toHaveBeenCalledWith({
      workspaceId: TEST_WORKSPACE_ID,
      userId: TEST_USER_ID,
      status: WorkspaceMemberStatus.PENDING,
    });
  });

  it('deletes a direct workspace member', async () => {
    memberRepo.delete.mockResolvedValue({ affected: 1 });

    await repository.deleteMember(TEST_WORKSPACE_ID, TEST_USER_ID);

    expect(memberRepo.delete).toHaveBeenCalledWith({
      workspaceId: TEST_WORKSPACE_ID,
      userId: TEST_USER_ID,
    });
  });
});
