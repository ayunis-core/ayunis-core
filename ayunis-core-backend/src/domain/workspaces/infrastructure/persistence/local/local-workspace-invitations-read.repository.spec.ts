import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import {
  TEST_ORG_ID,
  TEST_USER_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceMemberStatus } from 'src/domain/workspaces/domain/value-objects/workspace-member-status.enum';
import { LocalWorkspaceInvitationsReadRepository } from './local-workspace-invitations-read.repository';
import { WorkspaceInvitationMapper } from './mappers/workspace-invitation.mapper';
import { WorkspaceMemberRecord } from './schema/workspace-member.record';

describe('LocalWorkspaceInvitationsReadRepository', () => {
  const typeormRepository = { find: jest.fn() };
  const mapper = { toView: jest.fn() };
  let repository: LocalWorkspaceInvitationsReadRepository;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        LocalWorkspaceInvitationsReadRepository,
        {
          provide: getRepositoryToken(WorkspaceMemberRecord),
          useValue: typeormRepository,
        },
        { provide: WorkspaceInvitationMapper, useValue: mapper },
      ],
    }).compile();
    repository = module.get(LocalWorkspaceInvitationsReadRepository);
  });

  it('lists only pending invitations in the current organization', async () => {
    const records = [{ id: 'invitation-record' }];
    const invitations = [
      { workspace: { id: 'workspace-id' }, accessLevel: 'edit' },
    ];
    typeormRepository.find.mockResolvedValue(records);
    mapper.toView.mockReturnValue(invitations[0]);

    await expect(
      repository.findPendingByUser(TEST_USER_ID, TEST_ORG_ID),
    ).resolves.toEqual(invitations);
    expect(typeormRepository.find).toHaveBeenCalledWith({
      relations: { workspace: true },
      where: {
        userId: TEST_USER_ID,
        status: WorkspaceMemberStatus.PENDING,
        workspace: { orgId: TEST_ORG_ID },
      },
    });
  });
});
