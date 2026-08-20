import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import {
  TEST_TEAM_ID as TEAM_ID,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { LocalWorkspaceTeamGrantsRepository } from './local-workspace-team-grants.repository';
import { WorkspaceTeamGrantMapper } from './mappers/workspace-team-grant.mapper';
import { WorkspaceTeamGrantRecord } from './schema/workspace-team-grant.record';

const grant = {
  workspaceId: TEST_WORKSPACE_ID,
  teamId: TEAM_ID,
  accessLevel: WorkspaceAccessLevel.EDIT,
};

describe('LocalWorkspaceTeamGrantsRepository', () => {
  const typeormRepository = {
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const mapper = {
    toRecord: jest.fn(),
  };
  let repository: LocalWorkspaceTeamGrantsRepository;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        LocalWorkspaceTeamGrantsRepository,
        {
          provide: getRepositoryToken(WorkspaceTeamGrantRecord),
          useValue: typeormRepository,
        },
        { provide: WorkspaceTeamGrantMapper, useValue: mapper },
      ],
    }).compile();
    repository = module.get(LocalWorkspaceTeamGrantsRepository);
    mapper.toRecord.mockReturnValue({ id: 'record-id' });
  });

  it('creates a team grant', async () => {
    typeormRepository.insert.mockResolvedValue({});

    await expect(repository.createGrant(grant)).resolves.toEqual(grant);
  });

  it('returns null when the team already has a grant', async () => {
    typeormRepository.insert.mockRejectedValue({
      driverError: { code: '23505' },
    });

    await expect(repository.createGrant(grant)).resolves.toBeNull();
  });

  it('rethrows unexpected insert errors', async () => {
    const error = new Error('database unavailable');
    typeormRepository.insert.mockRejectedValue(error);

    await expect(repository.createGrant(grant)).rejects.toBe(error);
  });

  it('updates and returns a team grant', async () => {
    const updatedGrant = { ...grant, accessLevel: WorkspaceAccessLevel.FULL };
    typeormRepository.update.mockResolvedValue({ affected: 1 });

    await expect(
      repository.updateGrantAccessLevel(
        TEST_WORKSPACE_ID,
        TEAM_ID,
        WorkspaceAccessLevel.FULL,
      ),
    ).resolves.toEqual(updatedGrant);
  });

  it('returns null when updating a missing team grant', async () => {
    typeormRepository.update.mockResolvedValue({ affected: 0 });

    await expect(
      repository.updateGrantAccessLevel(
        TEST_WORKSPACE_ID,
        TEAM_ID,
        WorkspaceAccessLevel.FULL,
      ),
    ).resolves.toBeNull();
  });

  it('reports whether a team grant was deleted', async () => {
    typeormRepository.delete
      .mockResolvedValueOnce({ affected: 1 })
      .mockResolvedValueOnce({ affected: 0 });

    await expect(
      repository.deleteGrant(TEST_WORKSPACE_ID, TEAM_ID),
    ).resolves.toBe(true);
    await expect(
      repository.deleteGrant(TEST_WORKSPACE_ID, TEAM_ID),
    ).resolves.toBe(false);
  });
});
