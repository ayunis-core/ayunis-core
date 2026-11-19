import { randomUUID, type UUID } from 'crypto';
import {
  aUserContext,
  createMockContextService,
} from 'src/common/context/testing/context.fixtures';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import {
  KnowledgeBaseSyncDisabledError,
  SyncedLocationNotFoundError,
} from 'src/domain/knowledge-base-sync/application/knowledge-base-sync.errors';
import type { SyncRunRequest } from 'src/domain/knowledge-base-sync/application/ports/sync-runs.port';
import {
  createSyncHarness,
  featureConfig,
  KNOWLEDGE_BASE_ID,
  ORG_ID,
} from 'src/domain/knowledge-base-sync/application/testing/knowledge-base-sync.fixtures';
import { SyncLocationNowUseCase } from './sync-location-now.use-case';

describe('SyncLocationNowUseCase', () => {
  const harness = createSyncHarness();
  let queued: SyncRunRequest[] = [];
  beforeEach(() => {
    queued = [];
  });

  function syncNow(
    options: {
      orgId?: UUID;
      writable?: boolean;
      connectorsEnabled?: boolean;
    } = {},
  ) {
    return new SyncLocationNowUseCase(
      harness.repository,
      {
        execute: () =>
          options.writable === false
            ? Promise.reject(new KnowledgeBaseNotFoundError(KNOWLEDGE_BASE_ID))
            : Promise.resolve(),
      } as never,
      {
        enqueue: (runs: SyncRunRequest[]) => {
          queued.push(...runs);
          return Promise.resolve();
        },
      } as never,
      createMockContextService(
        aUserContext({ orgId: options.orgId ?? ORG_ID }),
      ),
      featureConfig(options.connectorsEnabled ?? true),
    ).execute({ locationId: harness.location.id });
  }

  it('queues a sync of the location for a user who may change its knowledge base', async () => {
    await syncNow();

    expect(queued).toEqual([
      { orgId: ORG_ID, locationId: harness.location.id },
    ]);
  });

  it('queues nothing for a user who may only read the knowledge base', async () => {
    await expect(syncNow({ writable: false })).rejects.toBeInstanceOf(
      KnowledgeBaseNotFoundError,
    );
    expect(queued).toEqual([]);
  });

  it('does not reveal a location of another organization', async () => {
    await expect(syncNow({ orgId: randomUUID() })).rejects.toBeInstanceOf(
      SyncedLocationNotFoundError,
    );
    expect(queued).toEqual([]);
  });

  it('is not available while connectors are switched off', async () => {
    await expect(syncNow({ connectorsEnabled: false })).rejects.toBeInstanceOf(
      KnowledgeBaseSyncDisabledError,
    );
    expect(queued).toEqual([]);
  });
});
