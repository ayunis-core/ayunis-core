import { randomUUID } from 'crypto';
import type { Queue } from 'bullmq';
import { SourceProcessingProgressAdapter } from './source-processing-progress.adapter';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { TextType, FileType } from 'src/domain/sources/domain/source-type.enum';

const queue = () => ({ getJob: jest.fn() });
describe(SourceProcessingProgressAdapter.name, () => {
  const documents = queue();
  const data = queue();
  const crawls = queue();
  const adapter = new SourceProcessingProgressAdapter(
    documents as unknown as Queue,
    data as unknown as Queue,
    crawls as unknown as Queue,
  );
  const source = () =>
    new FileSource({
      id: randomUUID(),
      name: 'budget.pdf',
      fileType: FileType.PDF,
      type: TextType.FILE,
      status: SourceStatus.PROCESSING,
    });
  beforeEach(() => jest.resetAllMocks());
  it('reports actual completed pages without inventing a total', async () => {
    documents.getJob.mockResolvedValue({
      getState: () => Promise.resolve('active'),
      progress: { stage: 'extracting', completed: 12, unit: 'pages' },
    });
    expect(await adapter.read(source())).toEqual({
      sourceId: expect.any(String),
      stage: 'extracting',
      completed: 12,
      unit: 'pages',
    });
  });
  it('does not show stale extraction counts while waiting to retry', async () => {
    documents.getJob.mockResolvedValue({
      getState: () => Promise.resolve('delayed'),
      progress: { stage: 'extracting', completed: 12, unit: 'pages' },
    });
    expect(await adapter.read(source())).toEqual({
      sourceId: expect.any(String),
      stage: 'retrying',
    });
  });
  it('uses persisted failure even when the queue still holds active progress', async () => {
    const failed = source();
    failed.status = SourceStatus.FAILED;
    expect(await adapter.read(failed)).toEqual({
      sourceId: failed.id,
      stage: 'failed',
    });
    expect(documents.getJob).not.toHaveBeenCalled();
  });
});
