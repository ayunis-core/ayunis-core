import type { UUID } from 'crypto';
import type { Queue } from 'bullmq';
import type { UrlCrawlJobData } from 'src/domain/sources/application/ports/url-crawl-processing.port';
import { UrlCrawlProducer } from './url-crawl.producer';

const SOURCE_ID = '00000000-0000-0000-0000-000000000001' as UUID;

function makeJobData(): UrlCrawlJobData {
  return {
    sourceId: SOURCE_ID,
    orgId: '00000000-0000-0000-0000-000000000010',
    userId: '00000000-0000-0000-0000-000000000020',
    rootUrl: 'https://www.stadt.example/',
    maxDepth: 1,
  };
}

describe('UrlCrawlProducer', () => {
  let producer: UrlCrawlProducer;
  let queue: jest.Mocked<
    Pick<Queue, 'add' | 'getJob' | 'getDeduplicationJobId'>
  >;

  beforeEach(() => {
    queue = {
      add: jest.fn().mockResolvedValue(undefined),
      getJob: jest.fn(),
      getDeduplicationJobId: jest.fn().mockResolvedValue(null),
    };
    producer = new UrlCrawlProducer(queue as unknown as Queue<UrlCrawlJobData>);
  });

  it('deduplicates runs by source id instead of fixing the job id', async () => {
    const data = makeJobData();
    await producer.enqueue(data);

    const [name, payload, options] = queue.add.mock.calls[0];
    expect(name).toBe('crawl-url');
    expect(payload).toBe(data);
    expect(options).toMatchObject({ deduplication: { id: SOURCE_ID } });
    expect(options).not.toHaveProperty('jobId');
  });

  it('cancels the run currently registered for the source', async () => {
    const delayedJob = {
      getState: jest.fn().mockResolvedValue('delayed'),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    queue.getDeduplicationJobId.mockResolvedValue('12');
    queue.getJob.mockResolvedValue(delayedJob as never);

    await producer.cancelJob(SOURCE_ID);

    expect(queue.getJob).toHaveBeenCalledWith('12');
    expect(delayedJob.remove).toHaveBeenCalled();
  });
});
