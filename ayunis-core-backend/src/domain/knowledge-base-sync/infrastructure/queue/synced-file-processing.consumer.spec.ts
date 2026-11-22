import type { UUID } from 'crypto';
import { DelayedError, type Job } from 'bullmq';
import type { Readable } from 'stream';
import type { SyncedFileJobData } from 'src/domain/knowledge-base-sync/application/ports/synced-file-jobs.port';
import { FailedSourcesDeletedListener } from 'src/domain/knowledge-base-sync/application/listeners/failed-sources-deleted.listener';
import { SyncedFileDocuments } from 'src/domain/knowledge-base-sync/application/services/synced-file-documents.service';
import { CompleteSyncedFileProcessingUseCase } from 'src/domain/knowledge-base-sync/application/use-cases/complete-synced-file-processing/complete-synced-file-processing.use-case';
import { FailSyncedFileProcessingUseCase } from 'src/domain/knowledge-base-sync/application/use-cases/fail-synced-file-processing/fail-synced-file-processing.use-case';
import { StartSyncedFileProcessingUseCase } from 'src/domain/knowledge-base-sync/application/use-cases/start-synced-file-processing/start-synced-file-processing.use-case';
import {
  ProcessingDeferredError,
  type DocumentToProcess,
} from 'src/domain/sources/application/models/document-to-process';
import { FailedSourcesDeletedEvent } from 'src/domain/sources/application/events/failed-sources-deleted.event';
import { SourceProcessingErrorCode } from 'src/domain/sources/domain/source-processing-error-code.enum';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { StorageUnavailableError } from 'src/domain/storage/application/storage.errors';
import { SyncedLocationState } from 'src/domain/knowledge-base-sync/domain/synced-location-state.enum';
import { SyncedFileSkipReason } from 'src/domain/knowledge-base-sync/domain/synced-file-skip-reason.enum';
import { SyncedFileState } from 'src/domain/knowledge-base-sync/domain/synced-file-state.enum';
import { PauseSyncedLocationUseCase } from 'src/domain/knowledge-base-sync/application/use-cases/pause-synced-location/pause-synced-location.use-case';
import { ProviderServerError } from 'src/common/errors/provider.errors';
import {
  connectorSyncSources,
  createSyncHarness,
  featureConfig,
  inlineTransactions,
  syncedLocationLocks,
  type FakeDocument,
  type FakeKnowledgeBase,
} from 'src/domain/knowledge-base-sync/application/testing/knowledge-base-sync.fixtures';
import { withChanges } from 'src/domain/knowledge-base-sync/application/testing/in-memory-synced-locations.fixtures';
import { SyncedFileProcessingConsumer } from './synced-file-processing.consumer';

const INDEXED = new Set([
  undefined,
  SourceStatus.READY,
  SourceStatus.REINDEXING,
]);

/**
 * The document pipeline on the fake knowledge base: a PROCESSING document
 * gets the stored original's text and turns READY, or FAILED while `failing`.
 * `hold()` keeps the next run waiting until released.
 */
class FakePipeline {
  failing = false;
  /** Thrown by the next run, as a failure BullMQ retries. */
  interruption: Error | null = null;
  /** While set, every run fails at the provider with it, like embeddings. */
  outage: Error | null = null;
  runs = 0;
  private held: { reached: () => void; released: Promise<void> } | null = null;

  constructor(
    private readonly knowledgeBase: FakeKnowledgeBase,
    private readonly storage: Map<string, string>,
  ) {}

  /** Resolves once the run is under way, with the function releasing it. */
  hold(): Promise<() => void> {
    let release!: () => void;
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    return new Promise((resolve) => {
      this.held = { reached: () => resolve(release), released };
    });
  }

  async process(_job: Job, document: DocumentToProcess): Promise<void> {
    if (!this.processing(document.sourceId)) return;
    const held = this.held;
    this.held = null;
    if (held) {
      held.reached();
      await held.released;
    }
    const source = this.processing(document.sourceId);
    if (!source) return;
    this.runs++;
    if (this.outage) {
      if (document.deferProviderOutages)
        throw new ProcessingDeferredError(this.outage);
      source.status = SourceStatus.FAILED;
      source.processingErrorCode =
        SourceProcessingErrorCode.PROCESSING_UNAVAILABLE;
      return;
    }
    const interruption = this.interruption;
    this.interruption = null;
    if (interruption) throw interruption;
    if (this.failing) {
      source.status = SourceStatus.FAILED;
      source.processingErrorCode =
        SourceProcessingErrorCode.DOCUMENT_UNREADABLE;
      return;
    }
    source.text = this.storage.get(document.minioPath);
    source.status = SourceStatus.READY;
  }

  private processing(id: UUID): FakeDocument | null {
    const source = this.knowledgeBase.documents.get(id);
    return source?.status === SourceStatus.PROCESSING ? source : null;
  }
}

/** The sources module's replacement use cases on the fake knowledge base. */
function fakeReplacements(knowledgeBase: FakeKnowledgeBase) {
  const documents = knowledgeBase.documents;
  return {
    create: {
      execute: (command: {
        id: UUID;
        replacedSourceId: UUID;
        name: string;
        storageKey: string;
      }) => {
        if (!documents.has(command.replacedSourceId))
          return Promise.resolve(null);
        knowledgeBase.deleteDocuments(
          [...documents.entries()].flatMap(([id, { replaces }]) =>
            replaces === command.replacedSourceId ? [id] : [],
          ),
        );
        documents.set(command.id, {
          name: command.name,
          knowledgeBaseId: null,
          status: SourceStatus.PROCESSING,
          replaces: command.replacedSourceId,
          storageKey: command.storageKey,
        });
        return Promise.resolve({ id: command.id });
      },
    },
    swapIn: {
      execute: ({
        replacementId,
        name,
      }: {
        replacementId: UUID;
        name: string;
      }) => {
        const replacement = documents.get(replacementId);
        const replacedId = replacement?.replaces;
        const replaced = replacedId ? documents.get(replacedId) : undefined;
        if (!replacement || !replacedId || !replaced)
          return Promise.resolve(null);
        const takesPlace =
          (replacement.status !== SourceStatus.FAILED &&
            INDEXED.has(replacement.status)) ||
          (replacement.status === SourceStatus.FAILED &&
            !INDEXED.has(replaced.status));
        if (!takesPlace) return Promise.resolve(null);
        documents.set(replacementId, {
          ...replacement,
          name,
          knowledgeBaseId: replaced.knowledgeBaseId,
          replaces: undefined,
        });
        knowledgeBase.deleteDocuments([replacedId]);
        return Promise.resolve({ id: replacedId, storageKey: null });
      },
    },
    get: {
      execute: ({ sourceIds }: { sourceIds: UUID[] }) =>
        Promise.resolve(
          sourceIds.flatMap((id) => {
            const source = documents.get(id);
            return source
              ? [
                  {
                    id,
                    status: source.status ?? SourceStatus.READY,
                    processingErrorCode: source.processingErrorCode ?? null,
                    storageKey: source.storageKey ?? null,
                  },
                ]
              : [];
          }),
        ),
    },
    markFailed: {
      execute: ({
        sourceId,
        errorCode,
      }: {
        sourceId: UUID;
        errorCode: SourceProcessingErrorCode;
      }) => {
        const source = documents.get(sourceId);
        if (source) {
          source.status = SourceStatus.FAILED;
          source.processingErrorCode = errorCode;
        }
        return Promise.resolve();
      },
    },
  };
}

async function readAll(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk as Buffer));
  return Buffer.concat(chunks).toString('utf8');
}

/**
 * The sync engine around one location with its processing: synced file jobs
 * run through the real consumer and use cases, on the fake source system,
 * knowledge base, storage and document pipeline.
 */
function createProcessingHarness(
  options: { processingEnabled?: boolean } = {},
) {
  const harness = createSyncHarness();
  const { repository, knowledgeBase, system } = harness;
  const storage = new Map<string, string>();
  const pipeline = new FakePipeline(knowledgeBase, storage);
  const replacements = fakeReplacements(knowledgeBase);
  const reindexed: UUID[] = [];
  const delays: number[] = [];
  const processingPaused: UUID[] = [];
  const pauseSourceProcessing = {
    execute: ({ sourceId }: { sourceId: UUID }) => {
      processingPaused.push(sourceId);
      return Promise.resolve();
    },
  } as never;
  const documents = new SyncedFileDocuments(
    repository,
    syncedLocationLocks(repository),
    replacements.swapIn as never,
    knowledgeBase.deleteSources as never,
    { execute: () => Promise.resolve() } as never,
    replacements.get as never,
    replacements.markFailed as never,
    inlineTransactions,
  );
  const upload = {
    failing: null as Error | null,
    execute: async ({
      objectName,
      data,
    }: {
      objectName: string;
      data: Readable;
    }) => {
      if (upload.failing) throw upload.failing;
      const text = await readAll(data);
      storage.set(objectName, text);
      return { size: Buffer.byteLength(text), etag: `"${objectName}"` };
    },
  };
  const consumer = new SyncedFileProcessingConsumer(
    { run: <T>(work: () => T) => work(), set: () => undefined } as never,
    { execute: () => Promise.resolve(true) } as never,
    new StartSyncedFileProcessingUseCase(
      repository,
      connectorSyncSources(system),
      upload as never,
      replacements.create as never,
      replacements.get as never,
      {
        execute: ({ objectName }: { objectName: string }) =>
          Promise.resolve({
            size: Buffer.byteLength(storage.get(objectName) ?? ''),
            etag: `"${objectName}"`,
          }),
      } as never,
      documents,
      pauseSourceProcessing,
      featureConfig(options.processingEnabled ?? true),
    ),
    new CompleteSyncedFileProcessingUseCase(
      replacements.get as never,
      documents,
    ),
    new FailSyncedFileProcessingUseCase(documents),
    pipeline as never,
    {
      reindexIfModelChanged: (sourceId: UUID) => {
        reindexed.push(sourceId);
        return Promise.resolve();
      },
    } as never,
    new PauseSyncedLocationUseCase(repository, pauseSourceProcessing),
    { handles: () => false } as never,
  );
  const listener = new FailedSourcesDeletedListener(repository);

  function aJob(data: SyncedFileJobData, attemptsMade: number) {
    return {
      id: `${data.sourceId}-${data.version}`,
      data,
      queueName: 'knowledge-base-sync',
      attemptsMade,
      opts: { attempts: 3 },
      timestamp: Date.now(),
      moveToDelayed: (timestamp: number) => {
        delays.push(timestamp);
        return Promise.resolve();
      },
      updateData: (changed: SyncedFileJobData) => {
        Object.assign(data, changed);
        return Promise.resolve();
      },
    } as unknown as Job<SyncedFileJobData>;
  }

  return {
    ...harness,
    storage,
    pipeline,
    upload,
    reindexed,
    delays,
    processingPaused,
    /** The location's pause is over. */
    endPause(): void {
      const location = repository.locations.get(harness.location.id)!;
      repository.locations.set(
        location.id,
        withChanges(location, { pausedUntil: new Date(0) }),
      );
    },
    process: (data: SyncedFileJobData, attemptsMade = 0) =>
      consumer.process(aJob(data, attemptsMade), 'token'),
    /** Processes every queued job once, oldest first. */
    async processQueued(): Promise<void> {
      for (const job of harness.jobs.splice(0))
        await consumer.process(aJob(job, 0), 'token');
    },
    /** The texts search finds in the knowledge base. */
    searchable(): string[] {
      return [...knowledgeBase.documents.values()]
        .filter(
          ({ knowledgeBaseId, status }) =>
            knowledgeBaseId !== null && status === SourceStatus.READY,
        )
        .map(({ text }) => text ?? '')
        .sort((a, b) => a.localeCompare(b));
    },
    /** A user removes a document, as the sources module does it. */
    async removeDocument(id: UUID): Promise<void> {
      const failed =
        knowledgeBase.documents.get(id)?.status === SourceStatus.FAILED;
      knowledgeBase.removeDocument(id);
      if (failed) await listener.handle(new FailedSourcesDeletedEvent([id]));
    },
  };
}

type Harness = ReturnType<typeof createProcessingHarness>;

function fileAt(harness: Harness, path: string) {
  const file = harness.filesOf().find((candidate) => candidate.path === path);
  if (!file) throw new Error(`No file at ${path}`);
  return file;
}

function documentOf(harness: Harness, path: string) {
  const { sourceId } = fileAt(harness, path);
  return sourceId ? harness.knowledgeBase.documents.get(sourceId) : undefined;
}

/** Syncs and processes what the sync queued. */
async function syncAndProcess(harness: Harness): Promise<void> {
  await harness.sync();
  await harness.processQueued();
}

describe('SyncedFileProcessingConsumer', () => {
  it('turns a new file into its READY document through the document pipeline and queues it no more', async () => {
    const harness = createProcessingHarness();
    harness.system.add('Satzungen/Hundesteuer.pdf');

    await syncAndProcess(harness);

    const file = fileAt(harness, 'Satzungen/Hundesteuer.pdf');
    expect(documentOf(harness, 'Satzungen/Hundesteuer.pdf')).toMatchObject({
      name: 'Hundesteuer.pdf',
      status: SourceStatus.READY,
    });
    expect(harness.searchable()).toEqual([
      `Hundesteuer.pdf at ${file.version}`,
    ]);
    expect(file).toMatchObject({
      documentVersion: file.version,
      processingErrorCode: null,
    });
    expect(harness.reindexed).toEqual([file.sourceId]);
    await harness.sync();
    expect(harness.jobs).toHaveLength(0);
  });

  it('keeps the old version searchable while a changed file is processed, then only the new one, with the same document count', async () => {
    const harness = createProcessingHarness();
    const id = harness.system.add('Hundesteuer.pdf');
    harness.knowledgeBase.upload(1);
    await syncAndProcess(harness);
    const before = fileAt(harness, 'Hundesteuer.pdf');
    harness.system.edit(id);
    await harness.sync();
    const after = fileAt(harness, 'Hundesteuer.pdf');

    const held = harness.pipeline.hold();
    const processing = harness.processQueued();
    const release = await held;
    expect(harness.searchable()).toEqual([
      `Hundesteuer.pdf at ${before.version}`,
    ]);
    expect(harness.knowledgeBase.names()).toEqual([
      'Hundesteuer.pdf',
      'Upload 0.pdf',
    ]);
    release();
    await processing;

    expect(harness.searchable()).toEqual([
      `Hundesteuer.pdf at ${after.version}`,
    ]);
    expect(harness.knowledgeBase.names()).toEqual([
      'Hundesteuer.pdf',
      'Upload 0.pdf',
    ]);
    expect(fileAt(harness, 'Hundesteuer.pdf').documentVersion).toBe(
      after.version,
    );
  });

  it('keeps the name a file was renamed to while its new version was processed', async () => {
    const harness = createProcessingHarness();
    const id = harness.system.add('Hundesteuer.pdf');
    await syncAndProcess(harness);
    harness.system.edit(id);
    await harness.sync();

    const held = harness.pipeline.hold();
    const processing = harness.processQueued();
    const release = await held;
    harness.system.relabel(id, 'Hundesteuersatzung 2025.pdf');
    await harness.sync();
    release();
    await processing;

    expect(harness.knowledgeBase.names()).toEqual([
      'Hundesteuersatzung 2025.pdf',
    ]);
  });

  it('keeps the indexed old version when the new one fails, recording the failure on the file without retrying that version', async () => {
    const harness = createProcessingHarness();
    const id = harness.system.add('Hundesteuer.pdf');
    await syncAndProcess(harness);
    const before = fileAt(harness, 'Hundesteuer.pdf');
    harness.system.edit(id);
    harness.pipeline.failing = true;

    await syncAndProcess(harness);

    const file = fileAt(harness, 'Hundesteuer.pdf');
    expect(file).toMatchObject({
      sourceId: before.sourceId,
      documentVersion: file.version,
      processingErrorCode: SourceProcessingErrorCode.DOCUMENT_UNREADABLE,
    });
    expect(harness.searchable()).toEqual([
      `Hundesteuer.pdf at ${before.version}`,
    ]);
    expect(harness.knowledgeBase.documents.size).toBe(1);
    await harness.sync();
    expect(harness.jobs).toHaveLength(0);
  });

  it('shows the failure on the document of a new file that cannot be processed', async () => {
    const harness = createProcessingHarness();
    harness.system.add('Hundesteuer.pdf');
    harness.pipeline.failing = true;

    await syncAndProcess(harness);

    expect(documentOf(harness, 'Hundesteuer.pdf')).toMatchObject({
      status: SourceStatus.FAILED,
      processingErrorCode: SourceProcessingErrorCode.DOCUMENT_UNREADABLE,
    });
    expect(fileAt(harness, 'Hundesteuer.pdf').processingErrorCode).toBe(
      SourceProcessingErrorCode.DOCUMENT_UNREADABLE,
    );
  });

  it('does not import a failed document again that a user removed, until its file changes', async () => {
    const harness = createProcessingHarness();
    const id = harness.system.add('Hundesteuer.pdf');
    harness.pipeline.failing = true;
    await syncAndProcess(harness);

    await harness.removeDocument(fileAt(harness, 'Hundesteuer.pdf').sourceId!);
    await syncAndProcess(harness);
    expect(harness.knowledgeBase.names()).toEqual([]);

    harness.system.edit(id);
    harness.pipeline.failing = false;
    await syncAndProcess(harness);
    expect(documentOf(harness, 'Hundesteuer.pdf')).toMatchObject({
      status: SourceStatus.READY,
    });
  });

  it('imports the newer version of a file whose failed document a user removed while that version was pending', async () => {
    const harness = createProcessingHarness();
    const id = harness.system.add('Hundesteuer.pdf');
    harness.pipeline.failing = true;
    await syncAndProcess(harness);
    harness.system.edit(id);
    await harness.sync();

    await harness.removeDocument(fileAt(harness, 'Hundesteuer.pdf').sourceId!);
    harness.pipeline.failing = false;
    harness.jobs.splice(0);
    await syncAndProcess(harness);

    expect(documentOf(harness, 'Hundesteuer.pdf')).toMatchObject({
      status: SourceStatus.READY,
      text: `Hundesteuer.pdf at ${fileAt(harness, 'Hundesteuer.pdf').version}`,
    });
  });

  it('goes on with the replacement of an earlier attempt on a retry, without reading the file again', async () => {
    const harness = createProcessingHarness();
    harness.system.add('Hundesteuer.pdf');
    await harness.sync();
    const [job] = harness.jobs;
    let reads = 0;
    const fetch = harness.system.fetch.bind(harness.system);
    harness.system.fetch = (id) => {
      reads++;
      return fetch(id);
    };
    harness.pipeline.interruption = new Error('converter busy');

    await expect(harness.process(job)).rejects.toThrow('converter busy');
    const [replacement] = [...harness.knowledgeBase.documents.keys()].filter(
      (id) => harness.knowledgeBase.documents.get(id)?.replaces,
    );
    await harness.process(job, 1);

    expect(reads).toBe(1);
    expect(fileAt(harness, 'Hundesteuer.pdf').sourceId).toBe(replacement);
    expect(documentOf(harness, 'Hundesteuer.pdf')?.status).toBe(
      SourceStatus.READY,
    );
  });

  describe('on a retry after the replacement was failed meanwhile', () => {
    async function retryAfter(failure: SourceProcessingErrorCode) {
      const harness = createProcessingHarness();
      harness.system.add('Hundesteuer.pdf');
      await harness.sync();
      const [job] = harness.jobs;
      let reads = 0;
      const fetch = harness.system.fetch.bind(harness.system);
      harness.system.fetch = (id) => {
        reads++;
        return fetch(id);
      };
      harness.pipeline.interruption = new Error('worker lost');
      await expect(harness.process(job)).rejects.toThrow('worker lost');
      const [replacement] = [
        ...harness.knowledgeBase.documents.values(),
      ].filter(({ replaces }) => replaces);
      replacement.status = SourceStatus.FAILED;
      replacement.processingErrorCode = failure;

      await harness.process(job, 1);

      return { harness, job, reads };
    }

    it('reads the file again when the stale cleanup failed the replacement of a dead worker, instead of settling the version as failed', async () => {
      const { harness, job, reads } = await retryAfter(
        SourceProcessingErrorCode.PROCESSING_TIMEOUT,
      );

      expect(reads).toBe(2);
      expect(documentOf(harness, 'Hundesteuer.pdf')).toMatchObject({
        status: SourceStatus.READY,
        text: `Hundesteuer.pdf at ${job.version}`,
      });
      expect(fileAt(harness, 'Hundesteuer.pdf')).toMatchObject({
        documentVersion: job.version,
        processingErrorCode: null,
      });
    });

    it("settles any other failure of the replacement as the version's failure, without reading the file again", async () => {
      const { harness, job, reads } = await retryAfter(
        SourceProcessingErrorCode.DOCUMENT_UNREADABLE,
      );

      expect(reads).toBe(1);
      expect(fileAt(harness, 'Hundesteuer.pdf')).toMatchObject({
        documentVersion: job.version,
        processingErrorCode: SourceProcessingErrorCode.DOCUMENT_UNREADABLE,
      });
    });
  });

  it('records the failure of a file that cannot be read on the last attempt', async () => {
    const harness = createProcessingHarness();
    harness.system.add('Hundesteuer.pdf');
    await harness.sync();
    const [job] = harness.jobs;
    harness.upload.failing = new StorageUnavailableError();

    await expect(harness.process(job, 2)).rejects.toBeInstanceOf(
      StorageUnavailableError,
    );

    expect(documentOf(harness, 'Hundesteuer.pdf')).toMatchObject({
      status: SourceStatus.FAILED,
      processingErrorCode: SourceProcessingErrorCode.PROCESSING_UNAVAILABLE,
    });
    expect(fileAt(harness, 'Hundesteuer.pdf').documentVersion).toBe(
      job.version,
    );
  });

  it('marks the location no longer accessible when its access is lost, keeping the documents', async () => {
    const harness = createProcessingHarness();
    const id = harness.system.add('Hundesteuer.pdf');
    await syncAndProcess(harness);
    harness.system.edit(id);
    await harness.sync();
    harness.system.accessGranted = false;

    await harness.processQueued();

    expect(harness.repository.locations.get(harness.location.id)?.state).toBe(
      SyncedLocationState.NO_LONGER_ACCESSIBLE,
    );
    expect(harness.searchable()).toHaveLength(1);
    harness.system.accessGranted = true;
    await syncAndProcess(harness);
    const file = fileAt(harness, 'Hundesteuer.pdf');
    expect(file.documentVersion).toBe(file.version);
  });

  it('removes a file that no longer exists with its document', async () => {
    const harness = createProcessingHarness();
    const id = harness.system.add('Hundesteuer.pdf');
    await harness.sync();
    harness.system.remove(id);

    await harness.processQueued();

    expect(harness.filesOf()).toEqual([]);
    expect(harness.knowledgeBase.documents.size).toBe(0);
  });

  it('skips a file found encrypted when it is read, removing its document instead of failing it', async () => {
    const harness = createProcessingHarness();
    const id = harness.system.add('Personalakte.docx');
    harness.system.add('Hundesteuer.pdf');
    await syncAndProcess(harness);
    harness.system.edit(id);
    harness.system.encrypted.add(id);

    await syncAndProcess(harness);

    expect(fileAt(harness, 'Personalakte.docx')).toMatchObject({
      state: SyncedFileState.SKIPPED,
      skipReason: SyncedFileSkipReason.ENCRYPTED,
      sourceId: null,
    });
    expect(harness.searchable()).toEqual([
      expect.stringContaining('Hundesteuer.pdf'),
    ]);
    await syncAndProcess(harness);
    expect(harness.jobs).toEqual([]);
  });

  it('delays the job until the source system allows it again, failing nothing', async () => {
    const harness = createProcessingHarness();
    harness.system.add('Hundesteuer.pdf');
    await harness.sync();
    const [job] = harness.jobs;
    const retryAt = new Date(Date.now() + 60_000);
    harness.system.throttledUntil = retryAt;

    await expect(harness.process(job)).rejects.toBeInstanceOf(DelayedError);

    expect(harness.delays).toEqual([retryAt.getTime()]);
    expect(documentOf(harness, 'Hundesteuer.pdf')?.status).toBe(
      SourceStatus.PROCESSING,
    );
    expect(fileAt(harness, 'Hundesteuer.pdf').documentVersion).toBeNull();
    expect(
      harness.repository.locations.get(harness.location.id)?.pausedUntil,
    ).toEqual(retryAt);
  });

  it('never retries a file at once when the source system asks to retry immediately', async () => {
    const harness = createProcessingHarness();
    harness.system.add('Hundesteuer.pdf');
    await harness.sync();
    const [job] = harness.jobs;
    harness.system.throttledUntil = new Date(Date.now() - 1_000);
    const before = Date.now();

    await expect(harness.process(job)).rejects.toBeInstanceOf(DelayedError);

    expect(harness.delays[0]).toBeGreaterThanOrEqual(before + 1_000);
  });

  it('pauses the location for an embedding outage instead of failing its files, and finishes them once it is over', async () => {
    const harness = createProcessingHarness();
    harness.system.add('Hundesteuer.pdf');
    harness.system.add('Gebühren.pdf');
    await harness.sync();
    const jobs = harness.jobs.splice(0);
    harness.pipeline.outage = new ProviderServerError({
      provider: 'mistral',
      upstreamStatus: 503,
    });

    for (const job of jobs)
      await expect(harness.process(job, 2)).rejects.toBeInstanceOf(
        DelayedError,
      );

    const pausedUntil = harness.repository.locations.get(
      harness.location.id,
    )?.pausedUntil;
    expect(pausedUntil!.getTime()).toBeGreaterThan(Date.now());
    // The second file waits for the pause without trying.
    expect(harness.pipeline.runs).toBe(1);
    expect(harness.delays).toEqual([
      pausedUntil!.getTime(),
      pausedUntil!.getTime(),
    ]);
    expect(harness.processingPaused).toHaveLength(2);
    expect(
      harness.filesOf().map(({ documentVersion }) => documentVersion),
    ).toEqual([null, null]);
    expect(
      ['Hundesteuer.pdf', 'Gebühren.pdf'].map(
        (path) => documentOf(harness, path)?.status,
      ),
    ).toEqual([SourceStatus.PROCESSING, SourceStatus.PROCESSING]);

    harness.pipeline.outage = null;
    harness.endPause();
    for (const job of jobs) await harness.process(job, 2);

    expect(harness.searchable()).toHaveLength(2);
    expect(
      harness.filesOf().every((file) => file.documentVersion === file.version),
    ).toBe(true);
  });

  it('keeps a replacement an earlier attempt left processing from being failed as stuck while it waits for a pause', async () => {
    const harness = createProcessingHarness();
    harness.system.add('Hundesteuer.pdf');
    await harness.sync();
    const [job] = harness.jobs.splice(0);
    harness.pipeline.interruption = new Error('converter busy');
    await expect(harness.process(job)).rejects.toThrow('converter busy');
    const [replacement] = [...harness.knowledgeBase.documents.keys()].filter(
      (id) => harness.knowledgeBase.documents.get(id)?.replaces,
    );
    const location = harness.repository.locations.get(harness.location.id)!;
    harness.repository.locations.set(
      location.id,
      withChanges(location, {
        pausedUntil: new Date(Date.now() + 60 * 60_000),
      }),
    );

    await expect(harness.process(job, 1)).rejects.toBeInstanceOf(DelayedError);

    expect(harness.processingPaused).toEqual([replacement]);
  });

  it('fails a file as usual once its job has paused for an hour, so one file cannot hold up its location for good', async () => {
    const harness = createProcessingHarness();
    harness.system.add('Hundesteuer.pdf');
    await harness.sync();
    const [job] = harness.jobs.splice(0);
    harness.pipeline.outage = new ProviderServerError({
      provider: 'mistral',
      upstreamStatus: 503,
    });

    for (let pause = 0; pause < 6; pause++) {
      await expect(harness.process(job)).rejects.toBeInstanceOf(DelayedError);
      harness.endPause();
    }
    await harness.process(job);

    expect(documentOf(harness, 'Hundesteuer.pdf')).toMatchObject({
      status: SourceStatus.FAILED,
      processingErrorCode: SourceProcessingErrorCode.PROCESSING_UNAVAILABLE,
    });
  });

  it('reads nothing for a version the file has moved on from, and discards a replacement whose version changed meanwhile', async () => {
    const harness = createProcessingHarness();
    const id = harness.system.add('Hundesteuer.pdf');
    await harness.sync();
    const [outdated] = harness.jobs.splice(0);
    harness.system.edit(id);
    await harness.sync();
    await harness.process(outdated);
    expect(harness.storage.size).toBe(0);

    const [current] = harness.jobs.splice(0);
    const held = harness.pipeline.hold();
    const processing = harness.process(current);
    const release = await held;
    harness.system.edit(id);
    await harness.sync();
    release();
    await processing;

    expect(documentOf(harness, 'Hundesteuer.pdf')?.status).toBe(
      SourceStatus.PROCESSING,
    );
    expect(harness.knowledgeBase.documents.size).toBe(1);
    await harness.processQueued();
    expect(harness.searchable()).toEqual([
      `Hundesteuer.pdf at ${fileAt(harness, 'Hundesteuer.pdf').version}`,
    ]);
  });

  it('reads no file while connectors are switched off', async () => {
    const harness = createProcessingHarness({ processingEnabled: false });
    harness.system.add('Hundesteuer.pdf');
    await harness.sync();

    await harness.processQueued();

    expect(harness.storage.size).toBe(0);
    expect(documentOf(harness, 'Hundesteuer.pdf')?.status).toBe(
      SourceStatus.PROCESSING,
    );
  });
});
