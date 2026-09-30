import type { UUID } from 'crypto';
import type { Job } from 'bullmq';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { TextType } from 'src/domain/sources/domain/source-type.enum';
import { FileType } from 'src/domain/sources/domain/source-type.enum';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import type { DocumentProcessingJobData } from 'src/domain/sources/application/ports/document-processing.port';
import type { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import { FileTooLargeError } from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import { DocumentProcessingConsumer } from './document-processing.consumer';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const SOURCE_ID = '00000000-0000-0000-0000-000000000001' as UUID;
const ORG_ID = '00000000-0000-0000-0000-000000000010' as UUID;
const USER_ID = '00000000-0000-0000-0000-000000000020' as UUID;
const KNOWLEDGE_BASE_ID = '00000000-0000-0000-0000-000000000030' as UUID;
const MINIO_PATH = `${ORG_ID}/processing/${SOURCE_ID}/doc.pdf`;

function makeJobData(
  overrides?: Partial<DocumentProcessingJobData>,
): DocumentProcessingJobData {
  return {
    sourceId: SOURCE_ID,
    orgId: ORG_ID,
    userId: USER_ID,
    minioPath: MINIO_PATH,
    fileName: 'doc.pdf',
    fileType: 'application/pdf',
    ...overrides,
  };
}

function makeSource(status = SourceStatus.PROCESSING): FileSource {
  return new FileSource({
    id: SOURCE_ID,
    name: 'doc.pdf',
    type: TextType.FILE,
    fileType: FileType.PDF,
    knowledgeBaseId: null,
    status,
    processingStartedAt: new Date(),
  });
}

function makeJob(
  overrides?: Partial<Job<DocumentProcessingJobData>>,
): Job<DocumentProcessingJobData> {
  return {
    data: makeJobData(),
    id: 'job-1',
    attemptsMade: 0,
    opts: { attempts: 3 },
    ...overrides,
  } as unknown as Job<DocumentProcessingJobData>;
}

/* ------------------------------------------------------------------ */
/*  Mocks                                                              */
/* ------------------------------------------------------------------ */

const contextService = {
  run: jest.fn((fn: () => Promise<void>) => fn()),
  set: jest.fn(),
};

const retrieveFileContentUseCase = {
  execute: jest.fn().mockResolvedValue({ pages: [{ text: 'hello world' }] }),
};

const splitTextUseCase = {
  execute: jest.fn().mockReturnValue({
    chunks: [{ text: 'hello world', metadata: { start: 0 } }],
  }),
};

const downloadObjectUseCase = {
  execute: jest.fn().mockResolvedValue(
    (async function* () {
      yield Buffer.from('pdf-bytes');
    })(),
  ),
};

const deleteObjectUseCase = { execute: jest.fn().mockResolvedValue(undefined) };

const sourceRepository = {
  findById: jest.fn(),
  save: jest.fn().mockImplementation((s: unknown) => Promise.resolve(s)),
  refreshProcessingHeartbeat: jest.fn().mockResolvedValue(true),
  updateStatusConditionally: jest.fn(),
};

const contentReplacement = {
  prepare: jest.fn(
    async (params: {
      sourceId: UUID;
      text: string;
      chunks: TextSourceContentChunk[];
    }) => ({
      text: params.text,
      chunks: params.chunks,
      index: { documentId: params.sourceId },
    }),
  ),
  commit: jest.fn<Promise<FileSource | null>, [FileSource, unknown]>(
    async (source) => source,
  ),
};

const helper = {
  markFailed: jest.fn().mockResolvedValue(undefined),
  cleanupIndex: jest.fn().mockResolvedValue(undefined),
};

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('DocumentProcessingConsumer', () => {
  let consumer: DocumentProcessingConsumer;

  beforeEach(() => {
    jest.clearAllMocks();
    sourceRepository.refreshProcessingHeartbeat.mockResolvedValue(true);

    consumer = new DocumentProcessingConsumer(
      contextService as never,
      retrieveFileContentUseCase as never,
      splitTextUseCase as never,
      downloadObjectUseCase as never,
      deleteObjectUseCase as never,
      sourceRepository as never,
      contentReplacement as never,
      helper as never,
    );
  });

  it('skips processing when the queued source can no longer be claimed', async () => {
    const source = makeSource(SourceStatus.PROCESSING);
    sourceRepository.findById.mockResolvedValue(source);
    sourceRepository.refreshProcessingHeartbeat.mockResolvedValue(false);

    await consumer.process(makeJob());

    expect(retrieveFileContentUseCase.execute).not.toHaveBeenCalled();
    expect(contentReplacement.commit).not.toHaveBeenCalled();
    expect(deleteObjectUseCase.execute).toHaveBeenCalled();
  });

  it('rethrows as JobRetryScheduledError when retries remain, so AppSignal ignores the attempt', async () => {
    const source = makeSource(SourceStatus.PROCESSING);
    sourceRepository.findById.mockResolvedValue(source);
    downloadObjectUseCase.execute.mockRejectedValueOnce(
      new Error('MinIO object not found'),
    );

    await expect(consumer.process(makeJob())).rejects.toMatchObject({
      name: 'JobRetryScheduledError',
      message: 'MinIO object not found',
    });
    expect(helper.markFailed).not.toHaveBeenCalled();
  });

  it('rethrows the original error on the final attempt', async () => {
    const source = makeSource(SourceStatus.PROCESSING);
    sourceRepository.findById.mockResolvedValue(source);
    downloadObjectUseCase.execute.mockRejectedValueOnce(
      new Error('MinIO object not found'),
    );

    await expect(
      consumer.process(makeJob({ attemptsMade: 2 } as never)),
    ).rejects.toMatchObject({
      name: 'Error',
      message: 'MinIO object not found',
    });
    expect(helper.markFailed).toHaveBeenCalled();
  });

  it('completes without throwing when the file itself is the problem', async () => {
    const source = makeSource(SourceStatus.PROCESSING);
    sourceRepository.findById.mockResolvedValue(source);
    retrieveFileContentUseCase.execute.mockRejectedValueOnce(
      new FileTooLargeError(),
    );

    // Completing rather than throwing is what keeps it out of AppSignal.
    await expect(consumer.process(makeJob())).resolves.toBeUndefined();
    expect(helper.markFailed).toHaveBeenCalled();
    expect(deleteObjectUseCase.execute).toHaveBeenCalled();
  });

  it('should skip saving and clean up when source is deleted mid-processing', async () => {
    const source = makeSource(SourceStatus.PROCESSING);

    // First findById (loadSourceOrSkip) returns the source
    // Second findById (reloadIfStillProcessing) returns null — deleted
    sourceRepository.findById
      .mockResolvedValueOnce(source)
      .mockResolvedValueOnce(null);

    await consumer.process(makeJob());

    // Nothing is committed — we aborted before writing
    expect(contentReplacement.commit).not.toHaveBeenCalled();
    // updateStatusConditionally should never be called either
    expect(sourceRepository.updateStatusConditionally).not.toHaveBeenCalled();
    // MinIO file should be cleaned up
    expect(deleteObjectUseCase.execute).toHaveBeenCalled();
  });

  it('writes content against the freshly loaded source so a knowledge base assigned after the load is kept', async () => {
    const assigned = makeSource(SourceStatus.PROCESSING);
    assigned.knowledgeBaseId = KNOWLEDGE_BASE_ID;
    // AddDocumentToKnowledgeBase assigns the knowledge base right after
    // enqueueing, so the worker's first read may predate it.
    sourceRepository.findById
      .mockResolvedValueOnce(makeSource(SourceStatus.PROCESSING))
      .mockResolvedValueOnce(assigned);
    sourceRepository.updateStatusConditionally.mockResolvedValue(true);

    await consumer.process(makeJob());

    const [savedSource] = contentReplacement.commit.mock.calls[0];
    expect(savedSource.knowledgeBaseId).toBe(KNOWLEDGE_BASE_ID);
  });

  it('should skip saving and clean up when the source status changes mid-processing', async () => {
    sourceRepository.findById
      .mockResolvedValueOnce(makeSource(SourceStatus.PROCESSING))
      .mockResolvedValueOnce(makeSource(SourceStatus.FAILED));

    await consumer.process(makeJob());

    expect(contentReplacement.commit).not.toHaveBeenCalled();
    expect(sourceRepository.updateStatusConditionally).not.toHaveBeenCalled();
    expect(deleteObjectUseCase.execute).toHaveBeenCalled();
  });

  it('does not mark the source ready when it is deleted before the commit', async () => {
    sourceRepository.findById.mockResolvedValue(
      makeSource(SourceStatus.PROCESSING),
    );
    contentReplacement.commit.mockResolvedValueOnce(null);

    await consumer.process(makeJob());

    expect(sourceRepository.updateStatusConditionally).not.toHaveBeenCalled();
    expect(helper.markFailed).not.toHaveBeenCalled();
    expect(deleteObjectUseCase.execute).toHaveBeenCalled();
  });

  it('should skip marking ready when conditional update returns false', async () => {
    const source = makeSource(SourceStatus.PROCESSING);

    // Both findById calls return the source (still processing)
    sourceRepository.findById.mockResolvedValue(source);
    // But the conditional update fails — source was deleted between check and update
    sourceRepository.updateStatusConditionally.mockResolvedValue(false);

    await consumer.process(makeJob());

    // Content was committed (source was still processing at check time)
    expect(contentReplacement.commit).toHaveBeenCalled();
    // Conditional update was attempted
    expect(sourceRepository.updateStatusConditionally).toHaveBeenCalledWith(
      SOURCE_ID,
      SourceStatus.PROCESSING,
      SourceStatus.READY,
      { processingError: null },
    );
    // Partial index should be cleaned up since update failed
    expect(helper.cleanupIndex).toHaveBeenCalledWith(SOURCE_ID);
  });

  it('should process normally when source exists throughout', async () => {
    const source = makeSource(SourceStatus.PROCESSING);

    sourceRepository.findById.mockResolvedValue(source);
    sourceRepository.updateStatusConditionally.mockResolvedValue(true);

    await consumer.process(makeJob());

    expect(contentReplacement.prepare).toHaveBeenCalledTimes(1);
    const [prepareParams] = contentReplacement.prepare.mock.calls[0];
    expect(prepareParams.sourceId).toBe(SOURCE_ID);
    expect(prepareParams).toMatchObject({ orgId: ORG_ID, text: 'hello world' });
    expect(prepareParams.chunks.map((chunk) => chunk.content)).toEqual([
      'hello world',
    ]);
    const prepared = await contentReplacement.prepare.mock.results[0].value;
    expect(contentReplacement.commit).toHaveBeenCalledWith(source, prepared);
    expect(sourceRepository.updateStatusConditionally).toHaveBeenCalledWith(
      SOURCE_ID,
      SourceStatus.PROCESSING,
      SourceStatus.READY,
      { processingError: null },
    );
  });

  it('embeds before re-reading the source, so the commit uses a copy read right before it', async () => {
    sourceRepository.findById.mockResolvedValue(
      makeSource(SourceStatus.PROCESSING),
    );
    sourceRepository.updateStatusConditionally.mockResolvedValue(true);

    await consumer.process(makeJob());

    const reloadOrder = sourceRepository.findById.mock.invocationCallOrder[1];
    expect(contentReplacement.prepare.mock.invocationCallOrder[0]).toBeLessThan(
      reloadOrder,
    );
    expect(
      contentReplacement.commit.mock.invocationCallOrder[0],
    ).toBeGreaterThan(reloadOrder);
  });

  it('marks the source failed without committing when embedding fails on the final attempt', async () => {
    sourceRepository.findById.mockResolvedValue(
      makeSource(SourceStatus.PROCESSING),
    );
    contentReplacement.prepare.mockRejectedValueOnce(
      new Error('embedding provider unavailable'),
    );

    await expect(
      consumer.process(makeJob({ attemptsMade: 2 } as never)),
    ).rejects.toThrow('embedding provider unavailable');

    expect(contentReplacement.commit).not.toHaveBeenCalled();
    expect(helper.markFailed).toHaveBeenCalled();
  });
});
