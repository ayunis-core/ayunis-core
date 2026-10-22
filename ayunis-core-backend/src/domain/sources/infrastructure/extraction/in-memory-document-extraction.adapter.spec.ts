import type { UUID } from 'crypto';
import { DocumentExtractionFailedError } from 'src/domain/sources/application/sources.errors';
import { InMemoryDocumentExtractionAdapter } from './in-memory-document-extraction.adapter';

const ORG_ID = '00000000-0000-0000-0000-000000000010' as UUID;
const SOURCE_ID = '00000000-0000-0000-0000-000000000001' as UUID;
const OTHER_SOURCE_ID = 'f0000000-0000-0000-0000-000000000002' as UUID;

function startInput(sourceId = SOURCE_ID) {
  return {
    idempotencyKey: `v1:${sourceId}:hash`,
    owner: { orgId: ORG_ID, sourceId },
    input: { key: `${ORG_ID}/processing/${sourceId}/a.pdf`, sha256: 'hash' },
    fileName: 'a.pdf',
    declaredMimeType: 'application/pdf',
    outputKeyPrefix: `${ORG_ID}/processing/${sourceId}/extraction/`,
  };
}

const resultRef = {
  bucket: 'ayunis',
  key: `${ORG_ID}/processing/${SOURCE_ID}/extraction/result.json`,
  bytes: 10,
  sha256: 'r',
  pageCount: 3,
};

describe(InMemoryDocumentExtractionAdapter.name, () => {
  let adapter: InMemoryDocumentExtractionAdapter;

  beforeEach(() => {
    adapter = new InMemoryDocumentExtractionAdapter();
  });

  it('returns the existing job for a known key instead of starting a second one', async () => {
    const first = await adapter.start(startInput());
    adapter.run(first.jobId);

    const second = await adapter.start(startInput());

    expect(second.jobId).toBe(first.jobId);
    expect(second.state).toBe('running');
    expect(adapter.jobCount).toBe(1);
  });

  it('re-queues a retryable failure in place and leaves a final one alone', async () => {
    const retryable = await adapter.start(startInput());
    adapter.fail(retryable.jobId, {
      code: 'OCR_UNAVAILABLE',
      message: 'down',
      retryable: true,
    });
    const final = await adapter.start(startInput(OTHER_SOURCE_ID));
    adapter.fail(final.jobId, {
      code: 'UNPROCESSABLE_DOCUMENT',
      message: 'corrupt',
      retryable: false,
    });

    const requeued = await adapter.start(startInput());
    const unchanged = await adapter.start(startInput(OTHER_SOURCE_ID));

    expect(requeued).toMatchObject({
      state: 'queued',
      attempt: 2,
      error: null,
    });
    expect(unchanged).toMatchObject({ state: 'failed', attempt: 1 });
  });

  it('never attaches a result to a cancelled job', async () => {
    const job = await adapter.start(startInput());
    adapter.run(job.jobId);

    await adapter.cancel(job.jobId);
    adapter.succeed(job.jobId, resultRef);

    expect(await adapter.status(job.jobId)).toMatchObject({
      state: 'cancelled',
      result: null,
    });
    await expect(adapter.result(job.jobId)).rejects.toBeInstanceOf(
      DocumentExtractionFailedError,
    );
  });

  it('serves the result only once succeeded', async () => {
    const job = await adapter.start(startInput());
    await expect(adapter.result(job.jobId)).rejects.toMatchObject({
      serviceCode: 'JOB_NOT_FINISHED',
    });

    adapter.succeed(job.jobId, resultRef);

    await expect(adapter.result(job.jobId)).resolves.toEqual(resultRef);
    expect((await adapter.status(job.jobId)).progress).toMatchObject({
      pagesTotal: 3,
      pagesDone: 3,
    });
  });

  it('releases by owner, cancelling what still runs, and forgets released jobs', async () => {
    const other = 'f0000000-0000-0000-0000-000000000003' as UUID;
    const running = await adapter.start(startInput());
    adapter.run(running.jobId);
    const done = await adapter.start(startInput(other));
    adapter.succeed(done.jobId, resultRef);

    await expect(adapter.releaseOwner({ orgId: ORG_ID })).resolves.toEqual({
      released: 2,
      cancelled: 1,
    });
    expect(adapter.jobCount).toBe(0);
    await expect(adapter.status(running.jobId)).rejects.toMatchObject({
      serviceCode: 'JOB_NOT_FOUND',
    });
  });

  it('scopes release to the given sources', async () => {
    const other = 'f0000000-0000-0000-0000-000000000003' as UUID;
    await adapter.start(startInput());
    await adapter.start(startInput(other));

    await adapter.releaseOwner({ orgId: ORG_ID, sourceIds: [other] });

    expect(adapter.jobCount).toBe(1);
    expect(adapter.findByKey(`v1:${SOURCE_ID}:hash`)).toBeDefined();
  });
});
