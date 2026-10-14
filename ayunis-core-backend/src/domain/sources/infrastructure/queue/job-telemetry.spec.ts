import { Appsignal, setTag } from '@appsignal/nodejs';
import { trace, SpanStatusCode, type Span } from '@opentelemetry/api';
import type { Job } from 'bullmq';
import { observeJob, recordJobFailure, processingStage } from './job-telemetry';

jest.mock('@appsignal/nodejs', () => ({
  Appsignal: { client: { metrics: jest.fn() } },
  setTag: jest.fn(),
}));

describe('job telemetry', () => {
  const metrics = {
    addDistributionValue: jest.fn(),
    incrementCounter: jest.fn(),
  };
  const job = {
    id: '00000000-0000-0000-0000-000000000001',
    queueName: 'document-processing',
    timestamp: 1000,
    processedOn: 4000,
    attemptsMade: 1,
    opts: { attempts: 1 },
    data: {
      sourceId: '00000000-0000-0000-0000-000000000001',
      fileName: 'private.pdf',
      credential: 'secret',
    },
  } as unknown as Job;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(Appsignal.client.metrics).mockReturnValue(metrics as never);
  });

  it('records wait and duration without payload dimensions and preserves the result', async () => {
    await expect(observeJob(job, async () => 'done')).resolves.toBe('done');
    expect(metrics.addDistributionValue).toHaveBeenCalledWith(
      'bullmq_queue_wait_seconds',
      3,
      { queue: 'document-processing' },
    );
    expect(metrics.addDistributionValue).toHaveBeenCalledWith(
      'bullmq_processing_seconds',
      expect.any(Number),
      { queue: 'document-processing' },
    );
    expect(setTag).toHaveBeenCalledWith('attempt', 2);
    expect(setTag).toHaveBeenCalledWith('sourceId', job.data.sourceId);
    expect(JSON.stringify(jest.mocked(setTag).mock.calls)).not.toContain(
      'private.pdf',
    );
    expect(
      JSON.stringify(metrics.addDistributionValue.mock.calls),
    ).not.toContain('secret');
  });

  it('preserves a thrown error and measures the failed attempt', async () => {
    const error = new Error('provider failed');
    await expect(
      observeJob(job, async () => {
        throw error;
      }),
    ).rejects.toBe(error);
    expect(metrics.addDistributionValue).toHaveBeenCalledTimes(2);
    expect(metrics.incrementCounter).toHaveBeenCalledWith(
      'bullmq_terminal_failure_count',
      1,
      { queue: 'document-processing' },
    );
  });

  it('does not double-count a failure already classified by the consumer', async () => {
    await expect(
      observeJob(job, async () => {
        recordJobFailure(job, true);
        throw new Error('classified failure');
      }),
    ).rejects.toThrow('classified failure');
    expect(metrics.incrementCounter).toHaveBeenCalledTimes(1);
  });

  it('counts retryable and quietly settled terminal failures separately', () => {
    recordJobFailure(job, false);
    recordJobFailure(job, true);
    expect(metrics.incrementCounter.mock.calls).toEqual([
      ['bullmq_retry_count', 1, { queue: 'document-processing' }],
      ['bullmq_terminal_failure_count', 1, { queue: 'document-processing' }],
    ]);
  });

  it('telemetry errors cannot alter processing', async () => {
    metrics.addDistributionValue.mockImplementation(() => {
      throw new Error('metrics failed');
    });
    await expect(observeJob(job, async () => 'done')).resolves.toBe('done');
    metrics.addDistributionValue.mockReset();
  });
});

describe('processing stage spans', () => {
  const span = { end: jest.fn(), setStatus: jest.fn() };
  const start = jest.fn((name: string, run: (current: Span) => unknown) =>
    run(span as unknown as Span),
  );

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(trace, 'getTracer')
      .mockReturnValue({ startActiveSpan: start } as never);
  });

  afterEach(() => jest.restoreAllMocks());

  it('closes a synchronous splitting span and preserves its return value', () => {
    expect(
      processingStage('document.splitting', () => 'private contents'),
    ).toBe('private contents');
    expect(start).toHaveBeenCalledWith(
      'document.splitting',
      expect.any(Function),
    );
    expect(span.end).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(span.setStatus.mock.calls)).not.toContain(
      'private contents',
    );
  });

  it('closes async extraction only after it settles and excludes error contents', async () => {
    const error = new Error('sensitive OCR response');
    const result = processingStage('document.extraction', async () => {
      throw error;
    });
    expect(span.end).not.toHaveBeenCalled();
    await expect(result).rejects.toBe(error);
    expect(span.end).toHaveBeenCalledTimes(1);
    expect(span.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.ERROR });
    expect(JSON.stringify(span.setStatus.mock.calls)).not.toContain(
      error.message,
    );
  });
});
