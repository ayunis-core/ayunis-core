const mockIncrementCounter = jest.fn();

jest.mock('@appsignal/nodejs', () => ({
  Appsignal: {
    client: {
      metrics: jest.fn(() => ({ incrementCounter: mockIncrementCounter })),
    },
  },
}));

import type { UUID } from 'crypto';
import type { Job } from 'bullmq';
import { ProviderTimeoutError } from 'src/common/errors/provider.errors';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import type { DocumentProcessingJobData } from 'src/domain/sources/application/ports/document-processing.port';
import type { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import { createMockSourceRepository } from 'src/domain/sources/application/testing/source.fixtures';
import { SourceIngestionService } from 'src/domain/sources/application/services/source-ingestion.service';
import { SourceContentDegradationGuard } from 'src/domain/sources/application/services/source-content-degradation-guard.service';
import { FileSourceExtractor } from 'src/domain/sources/application/services/file-source-extractor.service';
import { FileTooLargeError } from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import { DocumentProcessingConsumer } from './document-processing.consumer';

const SOURCE_ID = '00000000-0000-0000-0000-000000000001' as UUID;
const ORG_ID = '00000000-0000-0000-0000-000000000010' as UUID;
const USER_ID = '00000000-0000-0000-0000-000000000020' as UUID;
const MINIO_PATH = `${ORG_ID}/processing/${SOURCE_ID}/doc.pdf`;

function makeJob(
  overrides?: Partial<Job<DocumentProcessingJobData>>,
): Job<DocumentProcessingJobData> {
  return {
    data: {
      sourceId: SOURCE_ID,
      orgId: ORG_ID,
      userId: USER_ID,
      minioPath: MINIO_PATH,
      fileName: 'doc.pdf',
      fileType: 'application/pdf',
    },
    id: '17',
    attemptsMade: 0,
    opts: { attempts: 3 },
    ...overrides,
  } as unknown as Job<DocumentProcessingJobData>;
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

describe('DocumentProcessingConsumer', () => {
  const contextService = {
    run: jest.fn((fn: () => Promise<void>) => fn()),
    set: jest.fn(),
  };
  const retrieveFileContentUseCase = { execute: jest.fn() };
  const downloadObjectUseCase = { execute: jest.fn() };
  const deleteObjectUseCase = { execute: jest.fn() };
  const splitTextUseCase = {
    execute: jest.fn(() => ({
      chunks: [{ text: 'hello world', metadata: { start: 0 } }],
    })),
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
    commit: jest.fn(async (source: FileSource) => source),
  };
  const helper = {
    markFailed: jest.fn().mockResolvedValue(undefined),
    cleanupIndex: jest.fn().mockResolvedValue(undefined),
  };
  let sourceRepository: ReturnType<typeof createMockSourceRepository>;
  let consumer: DocumentProcessingConsumer;

  beforeEach(() => {
    jest.clearAllMocks();
    retrieveFileContentUseCase.execute.mockResolvedValue({
      pages: [{ text: 'hello world' }],
    });
    downloadObjectUseCase.execute.mockImplementation(async () =>
      (async function* () {
        yield Buffer.from('pdf-bytes');
      })(),
    );
    deleteObjectUseCase.execute.mockResolvedValue(undefined);
    sourceRepository = createMockSourceRepository();
    sourceRepository.findById.mockResolvedValue(makeSource());

    consumer = new DocumentProcessingConsumer(
      contextService as never,
      new SourceIngestionService(
        sourceRepository,
        contentReplacement as never,
        helper as never,
        new SourceContentDegradationGuard(sourceRepository),
      ),
      new FileSourceExtractor(
        downloadObjectUseCase as never,
        deleteObjectUseCase as never,
        retrieveFileContentUseCase as never,
        splitTextUseCase as never,
      ),
    );
  });

  it('ingests the staged file in the job owner context and marks the source ready', async () => {
    await consumer.process(makeJob());

    expect(contextService.set).toHaveBeenCalledWith('orgId', ORG_ID);
    expect(contextService.set).toHaveBeenCalledWith('userId', USER_ID);
    expect(retrieveFileContentUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: 'doc.pdf',
        fileType: 'application/pdf',
      }),
    );
    expect(contentReplacement.commit).toHaveBeenCalled();
    expect(sourceRepository.updateStatusConditionally).toHaveBeenCalledWith(
      SOURCE_ID,
      SourceStatus.PROCESSING,
      SourceStatus.READY,
      { processingError: null, lastIndexedAt: expect.any(Date) },
    );
    expect(deleteObjectUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ objectName: MINIO_PATH }),
    );
  });

  it('refuses a job without an org before touching the source', async () => {
    const job = makeJob();
    job.data.orgId = undefined as unknown as UUID;

    await expect(consumer.process(job)).rejects.toThrow('orgId is required');
    expect(sourceRepository.findById).not.toHaveBeenCalled();
  });

  it('deletes the staged file when the source can no longer be claimed', async () => {
    sourceRepository.refreshProcessingHeartbeat.mockResolvedValue(false);

    await consumer.process(makeJob());

    expect(retrieveFileContentUseCase.execute).not.toHaveBeenCalled();
    expect(deleteObjectUseCase.execute).toHaveBeenCalled();
  });

  it('deletes the staged file when the source is deleted mid-processing', async () => {
    sourceRepository.findById
      .mockResolvedValueOnce(makeSource())
      .mockResolvedValueOnce(null);

    await consumer.process(makeJob());

    expect(contentReplacement.commit).not.toHaveBeenCalled();
    expect(deleteObjectUseCase.execute).toHaveBeenCalled();
  });

  it('rethrows as JobRetryScheduledError and keeps the staged file when retries remain', async () => {
    downloadObjectUseCase.execute.mockRejectedValueOnce(
      new Error('MinIO object not found'),
    );

    await expect(consumer.process(makeJob())).rejects.toMatchObject({
      name: 'JobRetryScheduledError',
      message: 'MinIO object not found',
    });
    expect(helper.markFailed).not.toHaveBeenCalled();
    expect(deleteObjectUseCase.execute).not.toHaveBeenCalled();
  });

  it('rethrows the original error, marks the source failed and deletes the staged file on the final attempt', async () => {
    downloadObjectUseCase.execute.mockRejectedValueOnce(
      new Error('MinIO object not found'),
    );

    await expect(
      consumer.process(makeJob({ attemptsMade: 2 })),
    ).rejects.toMatchObject({
      name: 'Error',
      message: 'MinIO object not found',
    });
    expect(helper.markFailed).toHaveBeenCalledWith(
      SOURCE_ID,
      expect.objectContaining({ message: 'MinIO object not found' }),
    );
    expect(helper.cleanupIndex).toHaveBeenCalledWith(SOURCE_ID);
    expect(deleteObjectUseCase.execute).toHaveBeenCalled();
  });

  it('completes without throwing when the file itself is the problem', async () => {
    retrieveFileContentUseCase.execute.mockRejectedValueOnce(
      new FileTooLargeError(),
    );

    // Completing rather than throwing is what keeps it out of AppSignal.
    await expect(consumer.process(makeJob())).resolves.toBeUndefined();
    expect(helper.markFailed).toHaveBeenCalled();
    expect(deleteObjectUseCase.execute).toHaveBeenCalled();
  });

  it('counts an unavailable provider only once the job settles as failed', async () => {
    const timeout = new ProviderTimeoutError({ provider: 'mistral' });
    retrieveFileContentUseCase.execute
      .mockRejectedValueOnce(timeout)
      .mockRejectedValueOnce(timeout);

    await expect(consumer.process(makeJob())).rejects.toMatchObject({
      name: 'JobRetryScheduledError',
    });
    expect(mockIncrementCounter).not.toHaveBeenCalled();

    await expect(consumer.process(makeJob({ attemptsMade: 2 }))).rejects.toBe(
      timeout,
    );
    expect(mockIncrementCounter).toHaveBeenCalledTimes(1);
    expect(mockIncrementCounter).toHaveBeenCalledWith(
      'provider_unavailable_count',
      1,
      { provider: 'mistral' },
    );
  });
});
