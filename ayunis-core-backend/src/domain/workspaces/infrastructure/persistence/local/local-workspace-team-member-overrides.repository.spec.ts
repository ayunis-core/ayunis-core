import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import {
  TEST_TEAM_ID,
  TEST_USER_ID,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import { LocalWorkspaceTeamMemberOverridesRepository } from './local-workspace-team-member-overrides.repository';
import { WorkspaceTeamMemberOverrideMapper } from './mappers/workspace-team-member-override.mapper';
import { WorkspaceTeamGrantRecord } from './schema/workspace-team-grant.record';
import { WorkspaceTeamMemberOverrideRecord } from './schema/workspace-team-member-override.record';

const GRANT_ID = '55555555-5555-4555-8555-555555555555' as const;

describe('LocalWorkspaceTeamMemberOverridesRepository', () => {
  const builder = {
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    orUpdate: jest.fn().mockReturnThis(),
    execute: jest.fn(),
  };
  const grantRepository = { findOne: jest.fn() };
  const overrideRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(builder),
    delete: jest.fn(),
  };
  const mapper = { toRecord: jest.fn(), toDomain: jest.fn() };
  let repository: LocalWorkspaceTeamMemberOverridesRepository;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        LocalWorkspaceTeamMemberOverridesRepository,
        {
          provide: getRepositoryToken(WorkspaceTeamGrantRecord),
          useValue: grantRepository,
        },
        {
          provide: getRepositoryToken(WorkspaceTeamMemberOverrideRecord),
          useValue: overrideRepository,
        },
        { provide: WorkspaceTeamMemberOverrideMapper, useValue: mapper },
      ],
    }).compile();
    repository = module.get(LocalWorkspaceTeamMemberOverridesRepository);
  });

  it('upserts an override for an existing team grant', async () => {
    const override = {
      teamGrantId: GRANT_ID,
      userId: TEST_USER_ID,
      role: WorkspaceRole.EDIT,
      excluded: false,
    };
    grantRepository.findOne.mockResolvedValue({ id: GRANT_ID });
    mapper.toRecord.mockReturnValue({ id: 'override-id' });
    mapper.toDomain.mockReturnValue(override);
    builder.execute.mockResolvedValue({});

    await expect(
      repository.upsertOverride(TEST_WORKSPACE_ID, TEST_TEAM_ID, {
        userId: TEST_USER_ID,
        role: WorkspaceRole.EDIT,
        excluded: false,
      }),
    ).resolves.toEqual(override);
  });

  it('returns null when the team grant does not exist', async () => {
    grantRepository.findOne.mockResolvedValue(null);

    await expect(
      repository.upsertOverride(TEST_WORKSPACE_ID, TEST_TEAM_ID, {
        userId: TEST_USER_ID,
        role: null,
        excluded: true,
      }),
    ).resolves.toBeNull();
    expect(overrideRepository.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('reports whether an override was deleted', async () => {
    grantRepository.findOne.mockResolvedValue({ id: GRANT_ID });
    overrideRepository.delete
      .mockResolvedValueOnce({ affected: 1 })
      .mockResolvedValueOnce({ affected: 0 });

    await expect(
      repository.deleteOverride(TEST_WORKSPACE_ID, TEST_TEAM_ID, TEST_USER_ID),
    ).resolves.toBe(true);
    await expect(
      repository.deleteOverride(TEST_WORKSPACE_ID, TEST_TEAM_ID, TEST_USER_ID),
    ).resolves.toBe(false);
  });
});
