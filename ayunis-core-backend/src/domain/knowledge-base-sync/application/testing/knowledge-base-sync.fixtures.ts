import { randomUUID, type UUID } from 'crypto';
import type { ConfigService } from '@nestjs/config';
import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { Readable } from 'stream';
import {
  ConnectorSyncOutcome,
  type ConnectorChangesResult,
  type ConnectorItemContentResult,
} from 'src/domain/connectors/application/models/connector-sync-results';
import type {
  ConnectorItem,
  ConnectorItemUnprocessableReason,
} from 'src/domain/connectors/domain/sync/connector-item';
import { KnowledgeBasesConstants } from 'src/domain/knowledge-bases/domain/knowledge-bases.constants';
import type { SyncedFileJobData } from 'src/domain/knowledge-base-sync/application/ports/synced-file-jobs.port';
import { SyncedLocationsRepository } from 'src/domain/knowledge-base-sync/application/ports/synced-locations.repository';
import { SyncReconciler } from 'src/domain/knowledge-base-sync/application/services/sync-reconciler.service';
import { SyncPlanApplier } from 'src/domain/knowledge-base-sync/application/services/sync-plan-applier.service';
import { SyncedLocationLocks } from 'src/domain/knowledge-base-sync/application/services/synced-location-locks.service';
import { SyncLocationUseCase } from 'src/domain/knowledge-base-sync/application/use-cases/sync-location/sync-location.use-case';
import { SyncedFile } from 'src/domain/knowledge-base-sync/domain/synced-file.entity';
import { SyncedFileSkipReason } from 'src/domain/knowledge-base-sync/domain/synced-file-skip-reason.enum';
import { SyncedFileState } from 'src/domain/knowledge-base-sync/domain/synced-file-state.enum';
import { SyncedLocation } from 'src/domain/knowledge-base-sync/domain/synced-location.entity';
import { SyncedLocationState } from 'src/domain/knowledge-base-sync/domain/synced-location-state.enum';
import { CheckSourceFileAcceptanceUseCase } from 'src/domain/sources/application/use-cases/check-source-file-acceptance/check-source-file-acceptance.use-case';
import type { SourceProcessingErrorCode } from 'src/domain/sources/domain/source-processing-error-code.enum';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';

export const ORG_ID = '11111111-1111-4111-8111-111111111111' as UUID;
export const KNOWLEDGE_BASE_ID = '22222222-2222-4222-8222-222222222222' as UUID;
export const CONNECTOR_ID = '33333333-3333-4333-8333-333333333333' as UUID;

/**
 * One location in a provider, as its connector lists it: items keyed by ID,
 * and a change log whose length is the cursor, so a delta is everything
 * logged since.
 */
export class FakeSourceSystem {
  accessGranted = true;
  resyncDemanded = false;
  private readonly items = new Map<string, ConnectorItem>();
  private readonly log: { id: string; removed: boolean }[] = [];
  private versions = 0;

  add(
    path: string,
    options: {
      size?: number;
      unprocessable?: ConnectorItemUnprocessableReason;
    } = {},
  ): string {
    const id = randomUUID();
    this.items.set(id, {
      id,
      path,
      name: path.split('/').at(-1)!,
      version: this.nextVersion(),
      size: options.size ?? 1024,
      unprocessableReason: options.unprocessable,
    });
    this.log.push({ id, removed: false });
    return id;
  }

  edit(id: string, changes: Partial<ConnectorItem> = {}): void {
    this.items.set(id, {
      ...this.items.get(id)!,
      version: this.nextVersion(),
      ...changes,
    });
    this.log.push({ id, removed: false });
  }

  /** A rename or move keeps the item ID and the version. */
  relabel(id: string, path: string): void {
    this.items.set(id, {
      ...this.items.get(id)!,
      path,
      name: path.split('/').at(-1)!,
    });
    this.log.push({ id, removed: false });
  }

  remove(id: string): void {
    this.items.delete(id);
    this.log.push({ id, removed: true });
  }

  /** Providers report deletions of items the app never saw. */
  removeUnknown(): void {
    this.log.push({ id: randomUUID(), removed: true });
  }

  private held: Promise<void> | null = null;

  /** The next listing is made now but returned only once released. */
  holdNextListing(): () => void {
    let release!: () => void;
    this.held = new Promise((resolve) => {
      release = resolve;
    });
    return release;
  }

  /** Set to have every call answered with "retry at". */
  throttledUntil: Date | null = null;

  fetch(id: string): Promise<ConnectorItemContentResult> {
    const item = this.items.get(id);
    if (!this.accessGranted)
      return Promise.resolve({ outcome: ConnectorSyncOutcome.ACCESS_LOST });
    if (this.throttledUntil)
      return Promise.resolve({
        outcome: ConnectorSyncOutcome.THROTTLED,
        retryAt: this.throttledUntil,
      });
    if (!item) return Promise.resolve({ outcome: ConnectorSyncOutcome.GONE });
    const text = FakeSourceSystem.contentOf(item);
    return Promise.resolve({
      outcome: ConnectorSyncOutcome.CONTENT,
      content: Readable.from([text]),
      size: Buffer.byteLength(text),
    });
  }

  /** What a file holds at its version. */
  static contentOf(item: Pick<ConnectorItem, 'name' | 'version'>): string {
    return `${item.name} at ${item.version}`;
  }

  async listChanges(cursor: string | null): Promise<ConnectorChangesResult> {
    const listing = this.list(cursor);
    const held = this.held;
    this.held = null;
    if (held) await held;
    return listing;
  }

  private list(cursor: string | null): ConnectorChangesResult {
    if (!this.accessGranted)
      return { outcome: ConnectorSyncOutcome.ACCESS_LOST };
    const next = String(this.log.length);
    if (cursor === null || this.resyncDemanded) {
      this.resyncDemanded = false;
      return {
        outcome: ConnectorSyncOutcome.CHANGES,
        items: [...this.items.values()],
        removedItemIds: [],
        cursor: next,
        fullListing: true,
      };
    }
    const since = this.log.slice(Number(cursor));
    return {
      outcome: ConnectorSyncOutcome.CHANGES,
      items: since.flatMap(({ id, removed }) => {
        const item = this.items.get(id);
        return !removed && item ? [item] : [];
      }),
      removedItemIds: since.filter((e) => e.removed).map(({ id }) => id),
      cursor: next,
      fullListing: false,
    };
  }

  private nextVersion(): string {
    return `"{${++this.versions}},1"`;
  }
}

export interface FakeDocument {
  name: string;
  /** `null` for a hidden replacement. */
  knowledgeBaseId: UUID | null;
  status?: SourceStatus;
  /** The indexed text of a READY document. */
  text?: string;
  processingErrorCode?: SourceProcessingErrorCode;
  /** The document a hidden replacement replaces, deleted with it. */
  replaces?: UUID;
  storageKey?: string;
}

/**
 * The knowledge base's documents with their index entries and hidden
 * replacements, the 500-document limit and the `ON DELETE SET NULL` from
 * files to documents.
 */
export class FakeKnowledgeBase {
  readonly documents = new Map<UUID, FakeDocument>();

  constructor(
    private readonly files: () => InMemorySyncedLocationsRepository,
  ) {}

  upload(count: number): void {
    for (let index = 0; index < count; index++)
      this.documents.set(randomUUID(), {
        name: `Upload ${index}.pdf`,
        knowledgeBaseId: KNOWLEDGE_BASE_ID,
      });
  }

  /** A user removes a document, uploaded or synced. */
  removeDocument(id: UUID): void {
    this.deleteDocuments([id]);
  }

  /** The documents a user sees in the knowledge base. */
  names(): string[] {
    return [...this.documents.values()]
      .filter(({ knowledgeBaseId }) => knowledgeBaseId !== null)
      .map(({ name }) => name)
      .sort((a, b) => a.localeCompare(b));
  }

  readonly addSyncedDocuments = {
    execute: ({
      knowledgeBaseId,
      fileNames,
    }: {
      knowledgeBaseId: UUID;
      fileNames: string[];
    }) => {
      const room =
        KnowledgeBasesConstants.MAX_SOURCES -
        [...this.documents.values()].filter(
          (document) => document.knowledgeBaseId === knowledgeBaseId,
        ).length;
      const created = fileNames.slice(0, Math.max(0, room)).map((name) => {
        const id = randomUUID();
        this.documents.set(id, {
          name,
          knowledgeBaseId,
          status: SourceStatus.PROCESSING,
        });
        return { id };
      });
      return Promise.resolve(created);
    },
  };

  readonly deleteSources = {
    execute: ({ sourceIds }: { sourceIds: UUID[] }) => {
      this.deleteDocuments(sourceIds);
      return Promise.resolve();
    },
  };

  readonly renameSources = {
    execute: ({ renames }: { renames: { sourceId: UUID; name: string }[] }) => {
      for (const { sourceId, name } of renames) {
        const document = this.documents.get(sourceId);
        if (document) document.name = name;
      }
      return Promise.resolve();
    },
  };

  deleteDocuments(ids: UUID[]): void {
    const replacements = [...this.documents.entries()].flatMap(
      ([id, { replaces }]) => (replaces && ids.includes(replaces) ? [id] : []),
    );
    for (const id of [...ids, ...replacements]) this.documents.delete(id);
    this.files().clearSources(ids);
  }
}

export class InMemorySyncedLocationsRepository extends SyncedLocationsRepository {
  readonly locations = new Map<UUID, SyncedLocation>();
  readonly files = new Map<UUID, SyncedFile>();

  create(location: SyncedLocation): Promise<boolean> {
    const duplicate = [...this.locations.values()].some(
      (existing) =>
        existing.knowledgeBaseId === location.knowledgeBaseId &&
        existing.connectorId === location.connectorId &&
        existing.location === location.location,
    );
    if (!duplicate) this.locations.set(location.id, location);
    return Promise.resolve(!duplicate);
  }

  findById(id: UUID): Promise<SyncedLocation | null> {
    return Promise.resolve(this.locations.get(id) ?? null);
  }

  lockById(id: UUID): Promise<SyncedLocation | null> {
    return this.findById(id);
  }

  markNoLongerAccessible(id: UUID, lastSyncedAt: Date | null): Promise<void> {
    if (this.locations.get(id)?.lastSyncedAt === lastSyncedAt)
      this.update(id, { state: SyncedLocationState.NO_LONGER_ACCESSIBLE });
    return Promise.resolve();
  }

  recordSync(id: UUID, cursor: string, syncedAt: Date): Promise<void> {
    this.update(id, {
      cursor,
      lastSyncedAt: syncedAt,
      state: SyncedLocationState.ACTIVE,
    });
    return Promise.resolve();
  }

  delete(id: UUID): Promise<void> {
    this.locations.delete(id);
    for (const file of this.files.values())
      if (file.locationId === id) this.files.delete(file.id);
    return Promise.resolve();
  }

  findFileSourceIds(locationId: UUID): Promise<UUID[]> {
    return Promise.resolve(
      [...this.files.values()].flatMap((file) =>
        file.locationId === locationId && file.sourceId ? [file.sourceId] : [],
      ),
    );
  }

  lockFiles(locationId: UUID): Promise<SyncedFile[]> {
    return Promise.resolve(
      [...this.files.values()]
        .filter((file) => file.locationId === locationId)
        .map((file) => new SyncedFile({ ...file })),
    );
  }

  findFileById(id: UUID): Promise<SyncedFile | null> {
    const file = this.files.get(id);
    return Promise.resolve(file ? new SyncedFile({ ...file }) : null);
  }

  lockFile(id: UUID): Promise<SyncedFile | null> {
    return this.findFileById(id);
  }

  skipRemovedAfterFailure(sourceIds: UUID[]): Promise<void> {
    for (const file of this.files.values())
      if (
        file.lastSourceId &&
        sourceIds.includes(file.lastSourceId) &&
        file.sourceId === null &&
        file.state === SyncedFileState.IMPORTED &&
        file.documentVersion === file.version
      )
        file.skip(SyncedFileSkipReason.REMOVED_AFTER_FAILURE);
    return Promise.resolve();
  }

  saveFiles(files: SyncedFile[]): Promise<void> {
    for (const file of files) this.files.set(file.id, new SyncedFile(file));
    return Promise.resolve();
  }

  deleteFiles(fileIds: UUID[]): Promise<void> {
    for (const id of fileIds) this.files.delete(id);
    return Promise.resolve();
  }

  clearSources(sourceIds: UUID[]): void {
    for (const file of this.files.values())
      if (file.sourceId && sourceIds.includes(file.sourceId))
        file.sourceId = null;
  }

  private update(id: UUID, changes: Partial<SyncedLocation>): void {
    const location = this.locations.get(id);
    if (location)
      this.locations.set(id, new SyncedLocation({ ...location, ...changes }));
  }
}

export const inlineTransactions = {
  withTransaction: <T>(operation: () => Promise<T>) => operation(),
} as unknown as TransactionHost<TransactionalAdapterTypeOrm>;

export function featureConfig(connectorsEnabled: boolean): ConfigService {
  return {
    get: (key: string) =>
      key === 'features.connectorsEnabled' ? connectorsEnabled : undefined,
  } as unknown as ConfigService;
}

interface FakeQueue {
  jobs: SyncedFileJobData[];
  failing: boolean;
}

/** Locks that cannot be contended without a database. */
export function syncedLocationLocks(
  repository: SyncedLocationsRepository,
): SyncedLocationLocks {
  const noLock = { execute: () => Promise.resolve() } as never;
  return new SyncedLocationLocks(repository, noLock, noLock, noLock);
}

function syncLocationUseCase(
  repository: InMemorySyncedLocationsRepository,
  knowledgeBase: FakeKnowledgeBase,
  system: FakeSourceSystem,
  options: { connectorsEnabled: boolean; queue: FakeQueue },
): SyncLocationUseCase {
  return new SyncLocationUseCase(
    repository,
    {
      execute: ({ cursor }: { cursor: string | null }) =>
        system.listChanges(cursor),
    } as never,
    new CheckSourceFileAcceptanceUseCase(
      { maxUploadBytes: 200 * 1024 * 1024 } as never,
      { pdfMaxBytes: 100 * 1024 * 1024 },
    ),
    new SyncPlanApplier(
      repository,
      syncedLocationLocks(repository),
      new SyncReconciler(),
      knowledgeBase.addSyncedDocuments as never,
      knowledgeBase.renameSources as never,
      knowledgeBase.deleteSources as never,
      inlineTransactions,
    ),
    {
      enqueue: (_orgId: UUID, enqueued: SyncedFileJobData[]) => {
        if (options.queue.failing)
          return Promise.reject(new Error('Redis unavailable'));
        // Like BullMQ with the producer's job IDs: one job per document version.
        for (const job of enqueued)
          if (
            !options.queue.jobs.some(
              (queued) =>
                queued.sourceId === job.sourceId &&
                queued.version === job.version,
            )
          )
            options.queue.jobs.push(job);
        return Promise.resolve();
      },
      remove: () => Promise.resolve(),
    },
    featureConfig(options.connectorsEnabled),
  );
}

/** The sync engine around one location, with a fake provider and store. */
export function createSyncHarness(
  options: { connectorsEnabled?: boolean } = {},
) {
  const repository = new InMemorySyncedLocationsRepository();
  const knowledgeBase = new FakeKnowledgeBase(() => repository);
  const system = new FakeSourceSystem();
  const queue: FakeQueue = { jobs: [], failing: false };
  const location = new SyncedLocation({
    orgId: ORG_ID,
    knowledgeBaseId: KNOWLEDGE_BASE_ID,
    connectorId: CONNECTOR_ID,
    location: 'https://municipality.sharepoint.com/sites/bauamt/Dokumente',
  });
  void repository.create(location);
  const syncLocation = syncLocationUseCase(repository, knowledgeBase, system, {
    connectorsEnabled: options.connectorsEnabled ?? true,
    queue,
  });
  return {
    repository,
    knowledgeBase,
    system,
    queue,
    jobs: queue.jobs,
    location,
    filesOf: () =>
      [...repository.files.values()].filter(
        (file) => file.locationId === location.id,
      ),
    sync: () => syncLocation.execute({ locationId: location.id }),
  };
}
