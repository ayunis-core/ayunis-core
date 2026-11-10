jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: object, _key: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));
import type { UUID } from 'crypto';
import type { Queue } from 'bullmq';
import type { DocumentProcessingJobData } from 'src/domain/sources/application/ports/document-processing.port';
import { DocumentProcessingProducer } from './document-processing.producer';

const SOURCE_ID = '00000000-0000-0000-0000-000000000001' as UUID;

function makeJobData(
  overrides: Partial<DocumentProcessingJobData> = {},
): DocumentProcessingJobData {
  return {
    sourceId: SOURCE_ID,
    orgId: '00000000-0000-0000-0000-000000000010',
    userId: '00000000-0000-0000-0000-000000000020',
    minioPath: 'org/processing/src/doc.pdf',
    fileName: 'doc.pdf',
    fileType: 'application/pdf',
    ...overrides,
  };
}

describe('DocumentProcessingProducer', () => {
  let producer: DocumentProcessingProducer;
  let queue: jest.Mocked<Pick<Queue, 'add' | 'getJob'>>;
  let largeQueue: jest.Mocked<Pick<Queue, 'add' | 'getJob'>>;
  const saved = { ...process.env };

  beforeEach(() => {
    queue = {
      add: jest.fn().mockResolvedValue(undefined),
      getJob: jest.fn(),
    };
    largeQueue = {
      add: jest.fn().mockResolvedValue(undefined),
      getJob: jest.fn(),
    };
    producer = new DocumentProcessingProducer(
      { execute: jest.fn().mockResolvedValue({}) } as never,
      queue as unknown as Queue<DocumentProcessingJobData>,
      largeQueue as unknown as Queue<DocumentProcessingJobData>,
    );
  });

  afterEach(() => {
    process.env = { ...saved };
  });

  it('keeps small documents out of the lane for long-running jobs', async () => {
    await producer.enqueue(makeJobData({ expectedSize: 4_096 }));

    expect(queue.add).toHaveBeenCalledTimes(1);
    expect(largeQueue.add).not.toHaveBeenCalled();
  });

  it('routes recordings and large documents to their own lane under the same job id', async () => {
    const recording = makeJobData({
      fileName: 'rede.mp3',
      fileType: 'audio/mpeg',
      expectedSize: 4_096,
    });
    const largeDocument = makeJobData({ expectedSize: 300 * 1024 * 1024 });

    await producer.enqueue(recording);
    await producer.enqueue(largeDocument);

    expect(queue.add).not.toHaveBeenCalled();
    expect(largeQueue.add).toHaveBeenNthCalledWith(
      1,
      'process-document',
      recording,
      expect.objectContaining({ jobId: SOURCE_ID }),
    );
    expect(largeQueue.add).toHaveBeenNthCalledWith(
      2,
      'process-document',
      largeDocument,
      expect.objectContaining({ jobId: SOURCE_ID }),
    );
  });

  it('follows the configured size threshold', async () => {
    process.env.INGESTION_LARGE_FILE_BYTES = '1000';

    await producer.enqueue(makeJobData({ expectedSize: 1000 }));

    expect(largeQueue.add).toHaveBeenCalledTimes(1);
  });

  it('cancels a waiting job in the lane for long-running jobs', async () => {
    const waiting = {
      getState: jest.fn().mockResolvedValue('waiting'),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    queue.getJob.mockResolvedValue(undefined as never);
    largeQueue.getJob.mockResolvedValue(waiting as never);

    await producer.cancelJob(SOURCE_ID);

    expect(largeQueue.getJob).toHaveBeenCalledWith(SOURCE_ID);
    expect(waiting.remove).toHaveBeenCalled();
  });

  it('should enqueue job with sourceId as jobId', async () => {
    const data = makeJobData();
    await producer.enqueue(data);

    expect(queue.add).toHaveBeenCalledWith(
      'process-document',
      data,
      expect.objectContaining({ jobId: SOURCE_ID }),
    );
  });

  it('should remove a waiting job on cancelJob', async () => {
    const mockJob = {
      getState: jest.fn().mockResolvedValue('waiting'),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    queue.getJob.mockResolvedValue(mockJob as never);

    await producer.cancelJob(SOURCE_ID);

    expect(queue.getJob).toHaveBeenCalledWith(SOURCE_ID);
    expect(mockJob.remove).toHaveBeenCalled();
  });

  it('should not remove an active job on cancelJob', async () => {
    const mockJob = {
      getState: jest.fn().mockResolvedValue('active'),
      remove: jest.fn(),
    };
    queue.getJob.mockResolvedValue(mockJob as never);

    await producer.cancelJob(SOURCE_ID);

    expect(mockJob.remove).not.toHaveBeenCalled();
  });

  it('should not throw when job does not exist on cancelJob', async () => {
    queue.getJob.mockResolvedValue(undefined as never);

    await expect(producer.cancelJob(SOURCE_ID)).resolves.not.toThrow();
  });
});
