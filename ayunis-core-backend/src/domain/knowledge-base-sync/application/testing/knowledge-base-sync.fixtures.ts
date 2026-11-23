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
import {
  type ConnectorItem,
  ConnectorItemUnprocessableReason,
} from 'src/domain/connectors/domain/sync/connector-item';
import { KnowledgeBasesConstants } from 'src/domain/knowledge-bases/domain/knowledge-bases.constants';
import type { SyncedFileJobData } from 'src/domain/knowledge-base-sync/application/ports/synced-file-jobs.port';
import type { SyncedLocationsRepository } from 'src/domain/knowledge-base-sync/application/ports/synced-locations.repository';
import { SyncReconciler } from 'src/domain/knowledge-base-sync/application/services/sync-reconciler.service';
import { SyncPlanApplier } from 'src/domain/knowledge-base-sync/application/services/sync-plan-applier.service';
import { ConnectorSyncSource } from 'src/domain/knowledge-base-sync/application/services/connector-sync-source.service';
import { EnabledSyncProviders } from 'src/domain/knowledge-base-sync/application/services/enabled-sync-providers.service';
import { SyncSources } from 'src/domain/knowledge-base-sync/application/services/sync-sources.service';
import { WebSyncSource } from 'src/domain/knowledge-base-sync/application/services/web-sync-source.service';
import type { SyncedLocation } from 'src/domain/knowledge-base-sync/domain/synced-location.entity';
import { InMemorySyncedLocationsRepository } from './in-memory-synced-locations.fixtures';
import { SyncedLocationLocks } from 'src/domain/knowledge-base-sync/application/services/synced-location-locks.service';
import { NextSyncedFileBatchQuery } from 'src/domain/knowledge-base-sync/application/use-cases/next-synced-file-batch/next-synced-file-batch.query';
import { NextSyncedFileBatchUseCase } from 'src/domain/knowledge-base-sync/application/use-cases/next-synced-file-batch/next-synced-file-batch.use-case';
import { SyncLocationOutcome } from 'src/domain/knowledge-base-sync/application/use-cases/sync-location/sync-location.result';
import { SyncLocationUseCase } from 'src/domain/knowledge-base-sync/application/use-cases/sync-location/sync-location.use-case';
import { ConnectorSyncedLocation } from 'src/domain/knowledge-base-sync/domain/connector-synced-location.entity';
import { CheckSourceFileAcceptanceUseCase } from 'src/domain/sources/application/use-cases/check-source-file-acceptance/check-source-file-acceptance.use-case';
import type { SourceProcessingErrorCode } from 'src/domain/sources/domain/source-processing-error-code.enum';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';

export { InMemorySyncedLocationsRepository };

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

  /** Items found encrypted once read, which the listing cannot tell. */
  readonly encrypted = new Set<string>();

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
    if (this.encrypted.has(id))
      return Promise.resolve({
        outcome: ConnectorSyncOutcome.UNPROCESSABLE,
        reason: ConnectorItemUnprocessableReason.ENCRYPTED,
      });
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

  /** How often the location was listed. */
  listings = 0;

  async listChanges(cursor: string | null): Promise<ConnectorChangesResult> {
    this.listings++;
    const listing = this.list(cursor);
    const held = this.held;
    this.held = null;
    if (held) await held;
    return listing;
  }

  private list(cursor: string | null): ConnectorChangesResult {
    if (!this.accessGranted)
      return { outcome: ConnectorSyncOutcome.ACCESS_LOST };
    if (this.throttledUntil)
      return {
        outcome: ConnectorSyncOutcome.THROTTLED,
        retryAt: this.throttledUntil,
      };
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
  /** The name its type is read from, when not `name`. */
  fileName?: string | null;
  /** Where a citation opens it. */
  url?: string | null;
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
      documents,
    }: {
      knowledgeBaseId: UUID;
      documents: {
        name: string;
        fileName: string | null;
        url: string | null;
      }[];
    }) => {
      const room =
        KnowledgeBasesConstants.MAX_SOURCES -
        [...this.documents.values()].filter(
          (document) => document.knowledgeBaseId === knowledgeBaseId,
        ).length;
      const created = documents
        .slice(0, Math.max(0, room))
        .map(({ name, fileName, url }) => {
          const id = randomUUID();
          this.documents.set(id, {
            name,
            fileName,
            url,
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
    execute: ({
      renames,
    }: {
      renames: { sourceId: UUID; name: string; url: string | null }[];
    }) => {
      for (const { sourceId, name, url } of renames) {
        const document = this.documents.get(sourceId);
        if (document) Object.assign(document, { name, url });
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

export const inlineTransactions = {
  withTransaction: <T>(operation: () => Promise<T>) => operation(),
} as unknown as TransactionHost<TransactionalAdapterTypeOrm>;

export function enabledProviders(
  connectorsEnabled: boolean,
): EnabledSyncProviders {
  return new EnabledSyncProviders({
    get: (key: string) =>
      key === 'features.connectorsEnabled' ? connectorsEnabled : undefined,
  } as unknown as ConfigService);
}

export interface FakeQueue {
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

/** Answers every call as if no website were configured. */
const NO_WEBSITE = {
  execute: () => Promise.reject(new Error('No website in this harness')),
} as never;

/**
 * The sync sources, with the connectors module answering from `system` and,
 * if given, the URL crawler from `web`.
 */
export function connectorSyncSources(
  system: FakeSourceSystem,
  web: WebSyncSource = new WebSyncSource(NO_WEBSITE, NO_WEBSITE, NO_WEBSITE),
): SyncSources {
  return new SyncSources(
    new ConnectorSyncSource(
      {
        execute: ({ cursor }: { cursor: string | null }) =>
          system.listChanges(cursor),
      } as never,
      {
        execute: ({ itemId }: { itemId: string }) => system.fetch(itemId),
      } as never,
    ),
    web,
  );
}

function syncLocationUseCase(
  repository: InMemorySyncedLocationsRepository,
  knowledgeBase: FakeKnowledgeBase,
  sources: SyncSources,
  connectorsEnabled: boolean,
): SyncLocationUseCase {
  return new SyncLocationUseCase(
    repository,
    sources,
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
    enabledProviders(connectorsEnabled),
  );
}

/**
 * A run's feeding without waiting for the batches: every file it feeds is
 * queued, once per document version as with the producer's job IDs.
 */
async function feedAll(
  nextBatch: NextSyncedFileBatchUseCase,
  locationId: UUID,
  queue: FakeQueue,
): Promise<void> {
  let afterFileId: UUID | null = null;
  for (;;) {
    const batch = await nextBatch.execute(
      new NextSyncedFileBatchQuery(locationId, afterFileId),
    );
    if (batch.length === 0) return;
    if (queue.failing) throw new Error('Redis unavailable');
    for (const job of batch)
      if (
        !queue.jobs.some(
          (queued) =>
            queued.sourceId === job.sourceId && queued.version === job.version,
        )
      )
        queue.jobs.push(job);
    afterFileId = batch.at(-1)!.syncedFileId;
  }
}

/** The sync engine around one location, with a fake provider and store. */
export function createSyncHarness(
  options: { connectorsEnabled?: boolean } = {},
) {
  const system = new FakeSourceSystem();
  const location = new ConnectorSyncedLocation({
    orgId: ORG_ID,
    knowledgeBaseId: KNOWLEDGE_BASE_ID,
    connectorId: CONNECTOR_ID,
    location: 'https://municipality.sharepoint.com/sites/bauamt/Dokumente',
  });
  return {
    ...harnessFor(location, connectorSyncSources(system), options),
    system,
  };
}

/** The sync engine around `location`, listed and read through `sources`. */
export function harnessFor<L extends SyncedLocation>(
  location: L,
  sources: SyncSources,
  options: { connectorsEnabled?: boolean } = {},
) {
  const repository = new InMemorySyncedLocationsRepository();
  const knowledgeBase = new FakeKnowledgeBase(() => repository);
  const queue: FakeQueue = { jobs: [], failing: false };
  void repository.create(location);
  const connectorsEnabled = options.connectorsEnabled ?? true;
  const syncLocation = syncLocationUseCase(
    repository,
    knowledgeBase,
    sources,
    connectorsEnabled,
  );
  const nextBatch = new NextSyncedFileBatchUseCase(
    repository,
    enabledProviders(connectorsEnabled),
  );
  return {
    repository,
    knowledgeBase,
    sources,
    queue,
    jobs: queue.jobs,
    location,
    syncLocation,
    nextBatch,
    filesOf: () =>
      [...repository.files.values()].filter(
        (file) => file.locationId === location.id,
      ),
    /** A run: lists the changes and feeds the files that need processing. */
    async sync() {
      const result = await syncLocation.execute({ locationId: location.id });
      if (
        result.outcome === SyncLocationOutcome.SYNCED ||
        result.outcome === SyncLocationOutcome.SUPERSEDED
      )
        await feedAll(nextBatch, location.id, queue);
      return result;
    },
  };
}
