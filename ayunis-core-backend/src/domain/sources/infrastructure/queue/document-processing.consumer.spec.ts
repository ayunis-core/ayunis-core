import type { UUID } from 'crypto';
import type { Job } from 'bullmq';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';

// p-limit is ESM-only — mock the dynamic import so Jest (CJS) doesn't choke.
jest.mock('p-limit', () => ({
  __esModule: true,
  default:
    () =>
    <T>(fn: () => T) =>
      fn(),
}));
import { TextType } from 'src/domain/sources/domain/source-type.enum';
import { FileType } from 'src/domain/sources/domain/source-type.enum';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import type { DocumentProcessingJobData } from '../../application/ports/document-processing.port';
import { DocumentProcessingConsumer } from './document-processing.consumer';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const SOURCE_ID = '00000000-0000-0000-0000-000000000001' as UUID;
const ORG_ID = '00000000-0000-0000-0000-000000000010' as UUID;
const USER_ID = '00000000-0000-0000-0000-000000000020' as UUID;
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

const ingestContentUseCase = {
  execute: jest.fn().mockResolvedValue(undefined),
};
const deleteContentUseCase = {
  execute: jest.fn().mockResolvedValue(undefined),
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
  saveTextSource: jest
    .fn()
    .mockImplementation((s: unknown) => Promise.resolve(s)),
  updateStatusConditionally: jest.fn(),
};

const markSourceFailedUseCase = {
  execute: jest.fn().mockResolvedValue(undefined),
};

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('DocumentProcessingConsumer', () => {
  let consumer: DocumentProcessingConsumer;

  beforeEach(() => {
    jest.clearAllMocks();

    consumer = new DocumentProcessingConsumer(
      contextService as never,
      retrieveFileContentUseCase as never,
      splitTextUseCase as never,
      ingestContentUseCase as never,
      deleteContentUseCase as never,
      downloadObjectUseCase as never,
      deleteObjectUseCase as never,
      sourceRepository as never,
      markSourceFailedUseCase as never,
    );
  });

  it('should skip saving and clean up when source is deleted mid-processing', async () => {
    const source = makeSource(SourceStatus.PROCESSING);

    // First findById (loadSourceOrSkip) returns the source
    // Second findById (isSourceStillProcessing) returns null — deleted
    sourceRepository.findById
      .mockResolvedValueOnce(source)
      .mockResolvedValueOnce(null);

    await consumer.process(makeJob());

    // saveTextSource should never be called — we aborted before writing
    expect(sourceRepository.saveTextSource).not.toHaveBeenCalled();
    // updateStatusConditionally should never be called either
    expect(sourceRepository.updateStatusConditionally).not.toHaveBeenCalled();
    // MinIO file should be cleaned up
    expect(deleteObjectUseCase.execute).toHaveBeenCalled();
  });

  it('should skip marking ready when conditional update returns false', async () => {
    const source = makeSource(SourceStatus.PROCESSING);

    // Both findById calls return the source (still processing)
    sourceRepository.findById.mockResolvedValue(source);
    // But the conditional update fails — source was deleted between check and update
    sourceRepository.updateStatusConditionally.mockResolvedValue(false);

    await consumer.process(makeJob());

    // saveTextSource should have been called (source was still processing at check time)
    expect(sourceRepository.saveTextSource).toHaveBeenCalled();
    // Conditional update was attempted
    expect(sourceRepository.updateStatusConditionally).toHaveBeenCalledWith(
      SOURCE_ID,
      SourceStatus.PROCESSING,
      SourceStatus.READY,
      { processingError: null },
    );
    // Partial index should be cleaned up since update failed
    expect(deleteContentUseCase.execute).toHaveBeenCalled();
  });

  it('should process normally when source exists throughout', async () => {
    const source = makeSource(SourceStatus.PROCESSING);

    sourceRepository.findById.mockResolvedValue(source);
    sourceRepository.updateStatusConditionally.mockResolvedValue(true);

    await consumer.process(makeJob());

    expect(sourceRepository.saveTextSource).toHaveBeenCalled();
    expect(sourceRepository.updateStatusConditionally).toHaveBeenCalledWith(
      SOURCE_ID,
      SourceStatus.PROCESSING,
      SourceStatus.READY,
      { processingError: null },
    );
  });
});
