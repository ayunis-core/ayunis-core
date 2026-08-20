import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { TEST_WORKSPACE_ID } from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { LocalWorkspaceSharingReadRepository } from './local-workspace-sharing-read.repository';
import { WorkspaceSharingMapper } from './mappers/workspace-sharing.mapper';
import { WorkspaceMemberRecord } from './schema/workspace-member.record';
import { WorkspaceTeamGrantRecord } from './schema/workspace-team-grant.record';
import { WorkspaceTeamMemberOverrideRecord } from './schema/workspace-team-member-override.record';

const GRANT_ID = '55555555-5555-4555-8555-555555555555' as const;

describe('LocalWorkspaceSharingReadRepository', () => {
  const memberRepository = { find: jest.fn() };
  const grantRepository = { find: jest.fn() };
  const overrideRepository = { find: jest.fn() };
  const mapper = { toSnapshot: jest.fn() };
  let repository: LocalWorkspaceSharingReadRepository;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        LocalWorkspaceSharingReadRepository,
        {
          provide: getRepositoryToken(WorkspaceMemberRecord),
          useValue: memberRepository,
        },
        {
          provide: getRepositoryToken(WorkspaceTeamGrantRecord),
          useValue: grantRepository,
        },
        {
          provide: getRepositoryToken(WorkspaceTeamMemberOverrideRecord),
          useValue: overrideRepository,
        },
        { provide: WorkspaceSharingMapper, useValue: mapper },
      ],
    }).compile();
    repository = module.get(LocalWorkspaceSharingReadRepository);
  });

  it('reads all sharing records without per-grant queries', async () => {
    const members = [{ id: 'member-record' }];
    const grants = [{ id: GRANT_ID }];
    const overrides = [{ id: 'override-record', teamGrantId: GRANT_ID }];
    const snapshot = { members: [], teamGrants: [] };
    memberRepository.find.mockResolvedValue(members);
    grantRepository.find.mockResolvedValue(grants);
    overrideRepository.find.mockResolvedValue(overrides);
    mapper.toSnapshot.mockReturnValue(snapshot);

    await expect(repository.findSharing(TEST_WORKSPACE_ID)).resolves.toBe(
      snapshot,
    );
    expect(mapper.toSnapshot).toHaveBeenCalledWith(members, grants, overrides);
    expect(overrideRepository.find).toHaveBeenCalledTimes(1);
  });
});
