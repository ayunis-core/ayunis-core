import { randomUUID, type UUID } from 'crypto';
import { createMockContextService } from 'src/common/context/testing/context.fixtures';
import { aUserContext } from 'src/common/context/testing/context.fixtures';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import {
  KnowledgeBaseSyncDisabledError,
  SyncedLocationNotFoundError,
} from 'src/domain/knowledge-base-sync/application/knowledge-base-sync.errors';
import {
  createSyncHarness,
  enabledProviders,
  inlineTransactions,
  KNOWLEDGE_BASE_ID,
  ORG_ID,
  syncedLocationLocks,
} from 'src/domain/knowledge-base-sync/application/testing/knowledge-base-sync.fixtures';
import { RemoveSyncedLocationUseCase } from './remove-synced-location.use-case';

describe('RemoveSyncedLocationUseCase', () => {
  async function syncedHarness() {
    const harness = createSyncHarness();
    harness.system.add('Hundesteuer.pdf');
    harness.system.add('Gebühren.pdf');
    harness.knowledgeBase.upload(1);
    await harness.sync();
    return harness;
  }

  let removedJobs: { sourceId: UUID; version: string }[] = [];
  let removedRuns: UUID[] = [];
  beforeEach(() => {
    removedJobs = [];
    removedRuns = [];
  });

  function removal(
    harness: Awaited<ReturnType<typeof syncedHarness>>,
    options: {
      orgId?: typeof ORG_ID;
      writable?: boolean;
      connectorsEnabled?: boolean;
    } = {},
  ) {
    return new RemoveSyncedLocationUseCase(
      harness.repository,
      syncedLocationLocks(harness.repository),
      {
        execute: () =>
          options.writable === false
            ? Promise.reject(new KnowledgeBaseNotFoundError(KNOWLEDGE_BASE_ID))
            : Promise.resolve(),
      } as never,
      harness.knowledgeBase.deleteSources as never,
      {
        remove: (jobs: { sourceId: UUID; version: string }[]) => {
          removedJobs.push(...jobs);
          return Promise.resolve();
        },
      } as never,
      {
        remove: (locationId: UUID) => {
          removedRuns.push(locationId);
          return Promise.resolve();
        },
      } as never,
      createMockContextService(
        aUserContext({ orgId: options.orgId ?? ORG_ID }),
      ),
      inlineTransactions,
      enabledProviders(options.connectorsEnabled ?? true),
    );
  }

  it("removes the location with its files and documents, leaving the knowledge base's other documents", async () => {
    const harness = await syncedHarness();

    await removal(harness).execute({
      knowledgeBaseId: KNOWLEDGE_BASE_ID,
      locationId: harness.location.id,
    });

    expect(harness.repository.locations.size).toBe(0);
    expect(harness.repository.files.size).toBe(0);
    expect(harness.knowledgeBase.names()).toEqual(['Upload 0.pdf']);
  });

  it('removes its queued sync and the queued processing of its files', async () => {
    const harness = await syncedHarness();

    await removal(harness).execute({
      knowledgeBaseId: KNOWLEDGE_BASE_ID,
      locationId: harness.location.id,
    });

    expect(removedRuns).toEqual([harness.location.id]);
    expect(removedJobs).toEqual(
      expect.arrayContaining(
        harness.jobs.map(({ sourceId, version }) => ({ sourceId, version })),
      ),
    );
    expect(removedJobs).toHaveLength(2);
  });

  it('removes nothing for a user who may not change the knowledge base', async () => {
    const harness = await syncedHarness();

    await expect(
      removal(harness, { writable: false }).execute({
        knowledgeBaseId: KNOWLEDGE_BASE_ID,
        locationId: harness.location.id,
      }),
    ).rejects.toThrow(KnowledgeBaseNotFoundError);
    expect(harness.repository.locations.size).toBe(1);
    expect(harness.knowledgeBase.documents.size).toBe(3);
  });

  it("reports another organization's location as not found", async () => {
    const harness = await syncedHarness();

    await expect(
      removal(harness, { orgId: randomUUID() }).execute({
        knowledgeBaseId: KNOWLEDGE_BASE_ID,
        locationId: harness.location.id,
      }),
    ).rejects.toThrow(SyncedLocationNotFoundError);
    expect(harness.knowledgeBase.documents.size).toBe(3);
  });

  it('keeps a connector location and its documents while connectors are switched off', async () => {
    const harness = await syncedHarness();

    await expect(
      removal(harness, { connectorsEnabled: false }).execute({
        knowledgeBaseId: KNOWLEDGE_BASE_ID,
        locationId: harness.location.id,
      }),
    ).rejects.toThrow(KnowledgeBaseSyncDisabledError);
    expect(harness.repository.locations.size).toBe(1);
    expect(harness.knowledgeBase.documents.size).toBe(3);
  });

  it('reports a location as not found through another knowledge base', async () => {
    const harness = await syncedHarness();

    await expect(
      removal(harness).execute({
        knowledgeBaseId: randomUUID(),
        locationId: harness.location.id,
      }),
    ).rejects.toThrow(SyncedLocationNotFoundError);
    expect(harness.repository.locations.size).toBe(1);
  });
});
