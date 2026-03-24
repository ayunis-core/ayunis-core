import type { UUID } from 'crypto';
import type { Queue } from 'bullmq';
import type { DocumentProcessingJobData } from '../../application/ports/document-processing.port';
import { DocumentProcessingProducer } from './document-processing.producer';

const SOURCE_ID = '00000000-0000-0000-0000-000000000001' as UUID;

function makeJobData(): DocumentProcessingJobData {
  return {
    sourceId: SOURCE_ID,
    orgId: '00000000-0000-0000-0000-000000000010' as UUID,
    userId: '00000000-0000-0000-0000-000000000020' as UUID,
    minioPath: 'org/processing/src/doc.pdf',
    fileName: 'doc.pdf',
    fileType: 'application/pdf',
  };
}

describe('DocumentProcessingProducer', () => {
  let producer: DocumentProcessingProducer;
  let queue: jest.Mocked<Pick<Queue, 'add' | 'getJob'>>;

  beforeEach(() => {
    queue = {
      add: jest.fn().mockResolvedValue(undefined),
      getJob: jest.fn(),
    };
    producer = new DocumentProcessingProducer(
      queue as unknown as Queue<DocumentProcessingJobData>,
    );
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
