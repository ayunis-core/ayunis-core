import type { UUID } from 'crypto';
import { OparlFileTextStatus } from 'src/domain/oparl/domain/oparl-file-text';
import type { OparlPendingFile } from 'src/domain/oparl/application/models/oparl-document';
import type { OparlDocumentsProgress } from 'src/domain/oparl/application/models/oparl-documents-progress';
import type { OparlDocumentsRepository } from 'src/domain/oparl/application/ports/oparl-documents.repository';
import type { OparlMirrorRepository } from 'src/domain/oparl/application/ports/oparl-mirror.repository';
import type { OparlSystemsRepository } from 'src/domain/oparl/application/ports/oparl-systems.repository';
import { OparlSyncInterruptedError } from 'src/domain/oparl/application/oparl.errors';
import type { OparlChunkEmbedder } from 'src/domain/oparl/application/services/oparl-chunk-embedder.service';
import type { OparlChunker } from 'src/domain/oparl/application/services/oparl-chunker.service';
import type { OparlFileTextReader } from 'src/domain/oparl/application/services/oparl-file-text-reader.service';
import type { OparlObjectIndexer } from 'src/domain/oparl/application/services/oparl-object-indexer.service';
import { ProcessOparlDocumentsCommand } from './process-oparl-documents.command';
import { ProcessOparlDocumentsUseCase } from './process-oparl-documents.use-case';

const SYSTEM_ID = '4aa55908-4754-4d1f-87e6-051f4b2344cd' as UUID;
const BODY_ID = '9c2f4e1a-3b5d-4f6e-8a7b-1c2d3e4f5a6b' as UUID;

const pendingFile = (id: string): OparlPendingFile => ({
  id: id as UUID,
  bodyId: BODY_ID,
  name: 'Niederschrift',
  fileName: 'Niederschrift.pdf',
  mimeType: 'application/pdf',
  accessUrl: `https://rim.ekom21.de/aarbergen/files/${id}/Niederschrift.pdf`,
  downloadUrl: null,
  size: null,
  fingerprint: `fingerprint-${id}`,
  previous: null,
});

function setup({
  pending = [] as OparlPendingFile[][],
  lastRunFinishedAt = null as Date | null,
  embedded = true,
} = {}) {
  const system = { id: SYSTEM_ID, lastRunFinishedAt };
  const systems = { findById: jest.fn().mockResolvedValue(system) };
  const mirror = {
    findBodies: jest.fn().mockResolvedValue([{ id: BODY_ID }]),
  };
  // Read files stay pending (their metadata changed meanwhile).
  const files = pending.flat();
  const documents = {
    findPendingFiles: jest.fn(
      (_system: UUID, _before: Date, exclude: UUID[], limit: number) =>
        Promise.resolve(
          files.filter((file) => !exclude.includes(file.id)).slice(0, limit),
        ),
    ),
    saveFileText: jest.fn().mockResolvedValue(true),
    confirmFileText: jest.fn().mockResolvedValue(undefined),
    findFilesWithoutChunks: jest.fn().mockResolvedValue([]),
    refreshFileContext: jest.fn().mockResolvedValue(undefined),
  };
  const reader = { read: jest.fn() };
  const chunker = {
    fileChunks: jest.fn(() => [
      { text: 'Niederschrift', ordinal: 0, pageNumber: 1 },
    ]),
  };
  const objectIndexer = { index: jest.fn().mockResolvedValue(undefined) };
  const embedder = { embed: jest.fn().mockResolvedValue(embedded) };
  const useCase = new ProcessOparlDocumentsUseCase(
    systems as unknown as OparlSystemsRepository,
    mirror as unknown as OparlMirrorRepository,
    documents as unknown as OparlDocumentsRepository,
    reader as unknown as OparlFileTextReader,
    chunker as unknown as OparlChunker,
    objectIndexer as unknown as OparlObjectIndexer,
    embedder as unknown as OparlChunkEmbedder,
  );
  return { useCase, documents, reader, objectIndexer, embedder };
}

function command(
  progress: OparlDocumentsProgress | null = null,
  signal = new AbortController().signal,
) {
  return new ProcessOparlDocumentsCommand(
    SYSTEM_ID,
    progress,
    () => Promise.resolve(),
    signal,
  );
}

describe('ProcessOparlDocumentsUseCase', () => {
  afterEach(() => jest.restoreAllMocks());

  it('confirms a file whose bytes did not change instead of chunking it again', async () => {
    const { useCase, documents, reader } = setup({
      pending: [[pendingFile('1')]],
    });
    reader.read.mockResolvedValue('unchanged');

    await expect(useCase.execute(command())).resolves.toBeNull();

    expect(documents.confirmFileText).toHaveBeenCalledWith(
      '1',
      'fingerprint-1',
    );
    expect(documents.saveFileText).not.toHaveBeenCalled();
  });

  it('saves an extracted file with its chunks', async () => {
    const { useCase, documents, reader } = setup({
      pending: [[pendingFile('2')]],
    });
    const text = {
      status: OparlFileTextStatus.EXTRACTED,
      contentHash: 'hash',
      pages: [{ number: 1, text: 'Niederschrift' }],
    };
    reader.read.mockResolvedValue(text);

    await useCase.execute(command());

    expect(documents.saveFileText).toHaveBeenCalledWith(
      pendingFile('2'),
      text,
      [{ text: 'Niederschrift', ordinal: 0, pageNumber: 1 }],
    );
  });

  it('reads files beyond a full batch of files still pending after they were read', async () => {
    const files = Array.from({ length: 11 }, (_, index) =>
      pendingFile(String(index)),
    );
    const { useCase, reader } = setup({ pending: [files] });
    reader.read.mockResolvedValue('unchanged');

    await useCase.execute(command());

    expect(reader.read).toHaveBeenCalledTimes(11);
  });

  it('embeds the chunks so far in the first slice instead of only once every pending file is read', async () => {
    const files = Array.from({ length: 1000 }, (_, index) =>
      pendingFile(String(index)),
    );
    const { useCase, reader, embedder } = setup({
      pending: [files],
      embedded: false,
    });
    let now = Date.now();
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    // Each file takes a minute: the first batch alone outlasts the slice.
    reader.read.mockImplementation(() => {
      now += 60_000;
      return Promise.resolve('unchanged');
    });
    const timeToEmbed: number[] = [];
    embedder.embed.mockImplementation((_bodies: UUID[], deadline: number) => {
      timeToEmbed.push(deadline - now);
      return Promise.resolve(false);
    });

    const next = await useCase.execute(command());

    expect(next).not.toBeNull();
    expect(reader.read.mock.calls.length).toBeLessThan(files.length);
    expect(timeToEmbed).toHaveLength(1);
    expect(timeToEmbed[0]).toBeGreaterThan(0);
  });

  it('reads on after embedding what it read, within the same slice', async () => {
    const files = Array.from({ length: 30 }, (_, index) =>
      pendingFile(String(index)),
    );
    const { useCase, reader } = setup({ pending: [files] });
    let now = Date.now();
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    // Five minutes for all of them: more than reading's share of the slice.
    reader.read.mockImplementation(() => {
      now += 10_000;
      return Promise.resolve('unchanged');
    });

    await expect(useCase.execute(command())).resolves.toBeNull();
    expect(reader.read).toHaveBeenCalledTimes(30);
  });

  it('goes on in another slice while vectors are missing, without chunking the objects again', async () => {
    const { useCase, objectIndexer } = setup({ embedded: false });
    const progress = {
      startedAt: new Date().toISOString(),
      objectsIndexed: true,
    };

    await expect(useCase.execute(command(progress))).resolves.toBe(progress);
    expect(objectIndexer.index).not.toHaveBeenCalled();
  });

  it('starts over when the system was synced while the job ran, so new objects are indexed', async () => {
    const startedAt = new Date(Date.now() - 60_000);
    const { useCase } = setup({ lastRunFinishedAt: new Date() });

    const next = await useCase.execute(
      command({ startedAt: startedAt.toISOString(), objectsIndexed: true }),
    );

    expect(next).toMatchObject({ objectsIndexed: false });
    expect(new Date(next!.startedAt).getTime()).toBeGreaterThan(
      startedAt.getTime(),
    );
  });

  it('stops for a shutdown and says so, to be resumed', async () => {
    const controller = new AbortController();
    const { useCase, objectIndexer } = setup();
    objectIndexer.index.mockImplementation(() => {
      controller.abort();
      return Promise.reject(new Error('aborted'));
    });

    await expect(
      useCase.execute(command(null, controller.signal)),
    ).rejects.toBeInstanceOf(OparlSyncInterruptedError);
  });
});
