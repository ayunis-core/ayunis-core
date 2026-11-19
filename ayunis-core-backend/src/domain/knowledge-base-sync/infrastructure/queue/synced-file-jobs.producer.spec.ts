import { randomUUID } from 'crypto';
import type { SyncedFileJobData } from 'src/domain/knowledge-base-sync/application/ports/synced-file-jobs.port';
import { SyncedFileJobsProducer } from './synced-file-jobs.producer';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _prop: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

describe('SyncedFileJobsProducer', () => {
  const orgId = randomUUID();

  async function jobIdsOf(jobs: SyncedFileJobData[]): Promise<string[]> {
    const addBulk = jest.fn().mockResolvedValue([]);
    await new SyncedFileJobsProducer(
      { execute: jest.fn().mockResolvedValue(undefined) } as never,
      { addBulk } as never,
    ).enqueue(orgId, jobs);
    const [added] = addBulk.mock.calls[0] as [{ opts: { jobId: string } }[]];
    return added.map(({ opts }) => opts.jobId);
  }

  const job = (overrides: Partial<SyncedFileJobData> = {}) => ({
    orgId,
    knowledgeBaseId: randomUUID(),
    locationId: randomUUID(),
    syncedFileId: randomUUID(),
    sourceId: randomUUID(),
    version: '"c:{5C2A1F0E-2B7D-4F4B-9C3A-1D2E3F4A5B6C},3"',
    ...overrides,
  });

  it('queues a document version once, without the colon BullMQ rejects', async () => {
    const first = job();

    const [id, repeated] = await jobIdsOf([first, { ...first }]);

    expect(id).toBe(repeated);
    expect(id).not.toContain(':');
  });

  it('queues a new version and a document imported again after its removal', async () => {
    const first = job();

    const ids = await jobIdsOf([
      first,
      { ...first, version: '"c:{5C2A1F0E-2B7D-4F4B-9C3A-1D2E3F4A5B6C},4"' },
      { ...first, sourceId: randomUUID() },
    ]);

    expect(new Set(ids).size).toBe(3);
  });
});
