import type { UUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { OparlFileTextStatus } from 'src/domain/oparl/domain/oparl-file-text';
import type { OparlPendingFile } from 'src/domain/oparl/application/models/oparl-document';
import type { OparlDocumentsProgress } from 'src/domain/oparl/application/models/oparl-documents-progress';
import { OparlDocumentsRepository } from 'src/domain/oparl/application/ports/oparl-documents.repository';
import { OparlMirrorRepository } from 'src/domain/oparl/application/ports/oparl-mirror.repository';
import { OparlSystemsRepository } from 'src/domain/oparl/application/ports/oparl-systems.repository';
import {
  OparlSyncInterruptedError,
  UnexpectedOparlError,
} from 'src/domain/oparl/application/oparl.errors';
import { OparlChunkEmbedder } from 'src/domain/oparl/application/services/oparl-chunk-embedder.service';
import { OparlChunker } from 'src/domain/oparl/application/services/oparl-chunker.service';
import { OparlFileTextReader } from 'src/domain/oparl/application/services/oparl-file-text-reader.service';
import { OparlObjectIndexer } from 'src/domain/oparl/application/services/oparl-object-indexer.service';
import { ProcessOparlDocumentsCommand } from './process-oparl-documents.command';

/** A slice of the job; then it yields its worker slot to waiting syncs. */
const SLICE_MS = 10 * 60_000;
/**
 * Reading takes turns with embedding what was read, so a new system has
 * vectors long before all its files are read: it reads for at most this
 * long, then embeds until the slice ends (at least for `MIN_EMBED_MS`, even
 * when reading overran it), then reads on if time is left.
 */
const READ_TURN_MS = 5 * 60_000;
const MIN_EMBED_MS = 60_000;
const FILE_BATCH = 10;
/** Files read at once, as many as requests the client sends to one host. */
const FILE_LANES = 2;
const REPAIR_BATCH = 50;

async function inLanes<T>(
  items: T[],
  lanes: number,
  work: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items];
  const results = await Promise.allSettled(
    Array.from({ length: Math.min(lanes, items.length) }, async () => {
      for (let item = queue.shift(); item !== undefined; item = queue.shift())
        await work(item);
    }),
  );
  const failure = results.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  );
  if (failure) throw failure.reason;
}

/**
 * Makes a system's mirror searchable, without a user and charged to no
 * org: chunks the text fields of papers, meetings and agenda items, reads
 * the text of new and changed files into chunks, and embeds what lacks a
 * vector of the current model. Works in slices: returns the progress to go
 * on from, or `null` once done. Starts over when the system was synced
 * while it ran. On shutdown it throws `OparlSyncInterruptedError`.
 */
@Injectable()
export class ProcessOparlDocumentsUseCase {
  private readonly logger = new Logger(ProcessOparlDocumentsUseCase.name);

  constructor(
    private readonly systems: OparlSystemsRepository,
    private readonly mirror: OparlMirrorRepository,
    private readonly documents: OparlDocumentsRepository,
    private readonly reader: OparlFileTextReader,
    private readonly chunker: OparlChunker,
    private readonly objectIndexer: OparlObjectIndexer,
    private readonly embedder: OparlChunkEmbedder,
  ) {}

  @HandleUnexpectedErrors(UnexpectedOparlError)
  async execute(
    command: ProcessOparlDocumentsCommand,
  ): Promise<OparlDocumentsProgress | null> {
    const system = await this.systems.findById(command.systemId);
    if (!system) return null;
    this.logger.log({ systemId: system.id }, 'Processing OParl documents');
    try {
      return await this.slice(system.id, command);
    } catch (error) {
      if (command.signal.aborted) throw new OparlSyncInterruptedError();
      throw error;
    }
  }

  private async slice(
    systemId: UUID,
    { progress: resumed, saveProgress, signal }: ProcessOparlDocumentsCommand,
  ): Promise<OparlDocumentsProgress | null> {
    const deadline = Date.now() + SLICE_MS;
    const progress = resumed ?? fresh();
    if (!resumed) await saveProgress(progress);
    if (!progress.objectsIndexed) {
      await this.objectIndexer.index(systemId, signal);
      progress.objectsIndexed = true;
      await saveProgress(progress);
    }
    const bodies = await this.mirror.findBodies([systemId]);
    const bodyIds = bodies.map((body) => body.id);
    // A file still pending after it was read (it changed meanwhile, or the
    // database's clock is behind) waits for the next slice.
    const seen = new Set<UUID>();
    for (;;) {
      const readUntil = Math.min(deadline, Date.now() + READ_TURN_MS);
      const filesRead = await this.readFiles(
        systemId,
        progress,
        { seen, deadline: readUntil },
        signal,
      );
      if (filesRead) {
        await this.repairChunks(systemId, signal);
        await this.documents.refreshFileContext(systemId);
      }
      const embedUntil = Math.max(deadline, Date.now() + MIN_EMBED_MS);
      if (!(await this.embedder.embed(bodyIds, embedUntil, signal)))
        return progress;
      if (filesRead)
        return (await this.syncedSince(systemId, progress)) ? fresh() : null;
      if (Date.now() >= deadline) return progress;
    }
  }

  /** `false` when `deadline` came first. */
  private async readFiles(
    systemId: UUID,
    progress: OparlDocumentsProgress,
    { seen, deadline }: { seen: Set<UUID>; deadline: number },
    signal: AbortSignal,
  ): Promise<boolean> {
    const failedBefore = new Date(progress.startedAt);
    for (;;) {
      if (Date.now() >= deadline) return false;
      signal.throwIfAborted();
      const batch = await this.documents.findPendingFiles(
        systemId,
        failedBefore,
        [...seen],
        FILE_BATCH,
      );
      if (batch.length === 0) return true;
      for (const file of batch) seen.add(file.id);
      await inLanes(batch, FILE_LANES, (file) => this.readFile(file, signal));
    }
  }

  private async readFile(
    file: OparlPendingFile,
    signal: AbortSignal,
  ): Promise<void> {
    const text = await this.reader.read(file, signal);
    if (text === 'unchanged') {
      await this.documents.confirmFileText(file.id, file.fingerprint);
      return;
    }
    const chunks =
      text.status === OparlFileTextStatus.EXTRACTED
        ? this.chunker.fileChunks(text.pages)
        : [];
    await this.documents.saveFileText(file, text, chunks);
  }

  /** Chunks again, from their stored text, files whose chunks went with a deleted paper or meeting. */
  private async repairChunks(
    systemId: UUID,
    signal: AbortSignal,
  ): Promise<void> {
    const seen = new Set<UUID>();
    for (;;) {
      signal.throwIfAborted();
      const files = (
        await this.documents.findFilesWithoutChunks(systemId, REPAIR_BATCH)
      ).filter(({ file }) => !seen.has(file.id));
      if (files.length === 0) return;
      for (const { file, pages } of files) {
        seen.add(file.id);
        await this.documents.saveFileText(
          file,
          {
            status: OparlFileTextStatus.EXTRACTED,
            contentHash: file.previous?.contentHash ?? '',
            pages,
          },
          this.chunker.fileChunks(pages),
        );
      }
    }
  }

  private async syncedSince(
    systemId: UUID,
    progress: OparlDocumentsProgress,
  ): Promise<boolean> {
    const system = await this.systems.findById(systemId);
    const finishedAt = system?.lastRunFinishedAt;
    return !!finishedAt && finishedAt > new Date(progress.startedAt);
  }
}

function fresh(): OparlDocumentsProgress {
  return { startedAt: new Date().toISOString(), objectsIndexed: false };
}
