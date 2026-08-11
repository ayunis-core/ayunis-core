import { randomUUID, type UUID } from 'crypto';
import { Logger } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import { LocalWorkspacesRepository } from './local-workspaces.repository';
import { WorkspaceRecord } from './schema/workspace.record';
import type { WorkspaceUserSettingsRecord } from './schema/workspace-user-settings.record';
import { WorkspaceMapper } from './mappers/workspace.mapper';

const USER_ID = '11111111-1111-4111-8111-111111111111' as UUID;

function aRecord(params: {
  id?: UUID;
  name?: string;
  updatedAt?: string;
}): WorkspaceRecord {
  const record = new WorkspaceRecord();
  record.id = params.id ?? randomUUID();
  record.userId = USER_ID;
  record.orgId = randomUUID();
  record.name = params.name ?? 'Bürgeranfragen';
  record.description = null;
  record.icon = 'folder';
  record.color = 'violet';
  record.createdAt = new Date('2026-08-01T10:00:00.000Z');
  record.updatedAt = new Date(params.updatedAt ?? '2026-08-02T10:00:00.000Z');
  return record;
}

function aSettingsRow(params: {
  workspaceId: UUID;
  isPinned?: boolean;
  sortOrder?: number | null;
}): WorkspaceUserSettingsRecord {
  return {
    id: randomUUID(),
    workspaceId: params.workspaceId,
    userId: USER_ID,
    isPinned: params.isPinned ?? false,
    sortOrder: params.sortOrder ?? null,
  } as WorkspaceUserSettingsRecord;
}

describe('LocalWorkspacesRepository', () => {
  let repository: LocalWorkspacesRepository;
  let repo: jest.Mocked<Pick<Repository<WorkspaceRecord>, 'find' | 'save'>>;
  let settingsRepo: jest.Mocked<
    Pick<Repository<WorkspaceUserSettingsRecord>, 'find' | 'findOne'>
  > & { manager: { query: jest.Mock } };

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  beforeEach(() => {
    repo = { find: jest.fn(), save: jest.fn() };
    settingsRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      manager: { query: jest.fn().mockResolvedValue([]) },
    };
    repository = new LocalWorkspacesRepository(
      repo as unknown as Repository<WorkspaceRecord>,
      settingsRepo as unknown as Repository<WorkspaceUserSettingsRecord>,
      new WorkspaceMapper(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAllByUserId', () => {
    it('orders by the manual order, never-ordered last, latest edit breaking ties', async () => {
      const third = aRecord({ name: 'Explizit 4' });
      const first = aRecord({ name: 'Explizit 0' });
      const neverOrderedOld = aRecord({
        name: 'Nie sortiert, älter',
        updatedAt: '2026-08-03T10:00:00.000Z',
      });
      const neverOrderedNew = aRecord({
        name: 'Nie sortiert, neuer',
        updatedAt: '2026-08-05T10:00:00.000Z',
      });
      repo.find.mockResolvedValue([
        neverOrderedOld,
        third,
        neverOrderedNew,
        first,
      ]);
      settingsRepo.find.mockResolvedValue([
        aSettingsRow({ workspaceId: third.id, sortOrder: 4 }),
        aSettingsRow({ workspaceId: first.id, sortOrder: 0 }),
        aSettingsRow({ workspaceId: neverOrderedOld.id, sortOrder: null }),
      ]);

      const result = await repository.findAllByUserId(USER_ID);

      expect(result.map((workspace) => workspace.name)).toEqual([
        'Explizit 0',
        'Explizit 4',
        'Nie sortiert, neuer',
        'Nie sortiert, älter',
      ]);
    });

    it('hydrates pin state from the settings row', async () => {
      const record = aRecord({});
      repo.find.mockResolvedValue([record]);
      settingsRepo.find.mockResolvedValue([
        aSettingsRow({ workspaceId: record.id, isPinned: true }),
      ]);

      const [workspace] = await repository.findAllByUserId(USER_ID);

      expect(workspace.isPinned).toBe(true);
    });
  });

  describe('save', () => {
    it('persists the workspace row and leaves the settings row alone', async () => {
      const record = aRecord({});
      repo.find.mockResolvedValue([record]);
      settingsRepo.find.mockResolvedValue([
        aSettingsRow({ workspaceId: record.id, sortOrder: null }),
      ]);
      const [workspace] = await repository.findAllByUserId(USER_ID);

      workspace.rename('Umbenannt');
      await repository.save(workspace);

      expect(repo.save).toHaveBeenCalled();
      expect(settingsRepo.manager.query).not.toHaveBeenCalled();
    });
  });

  describe('saveSettings', () => {
    it('upserts pin state and manual order in one statement', async () => {
      const record = aRecord({});
      repo.find.mockResolvedValue([record]);
      settingsRepo.find.mockResolvedValue([]);
      const [workspace] = await repository.findAllByUserId(USER_ID);

      await repository.saveSettings(workspace);

      expect(settingsRepo.manager.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT ("workspaceId", "userId")'),
        [expect.any(String), workspace.id, USER_ID, false, 0],
      );
    });
  });

  describe('togglePinned', () => {
    it('returns the flipped pin state', async () => {
      settingsRepo.manager.query.mockResolvedValue([{ isPinned: true }]);

      await expect(
        repository.togglePinned(USER_ID, randomUUID()),
      ).resolves.toBe(true);
    });

    it('reports a vanished workspace as not found instead of a raw FK error', async () => {
      settingsRepo.manager.query.mockRejectedValue({
        driverError: { code: '23503' },
      });

      await expect(
        repository.togglePinned(USER_ID, randomUUID()),
      ).rejects.toThrow(WorkspaceNotFoundError);
    });
  });
});
