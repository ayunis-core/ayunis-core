import { Appsignal } from '@appsignal/nodejs';
import type { Job } from 'bullmq';
import { isFinalAttempt } from './job-telemetry';
import {
  isExpectedFailure,
  classifyJobFailure,
  documentRetryDelayMs,
  JobRetryScheduledError,
} from './bullmq-job.helpers';
import {
  DocumentConversionTimeoutError,
  DocumentConversionUnavailableError,
  DocumentConverterBusyError,
} from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import {
  ProviderRequestRejectedError,
  ProviderTimeoutError,
} from 'src/common/errors/provider.errors';

const mockIncrementCounter = jest.fn();

jest.mock('@appsignal/nodejs', () => ({
  Appsignal: {
    client: {
      metrics: jest.fn(() => ({ incrementCounter: mockIncrementCounter })),
    },
  },
}));

const incrementCounter = Appsignal.client.metrics()
  .incrementCounter as jest.Mock;

function jobWith(
  attemptsMade: number,
  attempts?: number,
  failedReason?: string,
): Job {
  return { attemptsMade, opts: { attempts }, failedReason } as Job;
}

class FakeRetrieverError extends ApplicationError {
  constructor(statusCode: number) {
    super(
      `retrieval failed with ${statusCode}`,
      'RETRIEVAL_FAILED',
      statusCode,
    );
    this.name = 'FakeRetrieverError';
  }
}

describe('isFinalAttempt', () => {
  it('is false while retries remain (attempt 1 of 3)', () => {
    expect(isFinalAttempt(jobWith(0, 3))).toBe(false);
  });

  it('is false on the middle attempt (attempt 2 of 3)', () => {
    expect(isFinalAttempt(jobWith(1, 3))).toBe(false);
  });

  it('is true on the last configured attempt (attempt 3 of 3)', () => {
    expect(isFinalAttempt(jobWith(2, 3))).toBe(true);
  });

  it('is true on the first attempt when opts.attempts is unset (BullMQ does not retry)', () => {
    expect(isFinalAttempt(jobWith(0))).toBe(true);
  });
});

describe('isExpectedFailure', () => {
  it('is true for an ApplicationError below 500', () => {
    expect(isExpectedFailure(new FakeRetrieverError(422))).toBe(true);
  });

  it('is false for an ApplicationError at 500 and above', () => {
    expect(isExpectedFailure(new FakeRetrieverError(503))).toBe(false);
  });

  it('is false for a plain Error, which carries no status', () => {
    expect(isExpectedFailure(new Error('socket hang up'))).toBe(false);
  });
});

describe('documentRetryDelayMs', () => {
  // Every replica was occupied; retrying within seconds lands in the same
  // busy period and spends the remaining attempts on it (AYC-1741).
  it('spaces retries of a busy converter over minutes', () => {
    const busy = new JobRetryScheduledError(
      new DocumentConverterBusyError('report.docx'),
    );

    expect(documentRetryDelayMs(1, busy)).toBe(60_000);
    expect(documentRetryDelayMs(2, busy)).toBe(120_000);
  });

  it('retries a conversion timeout after half a minute', () => {
    const timeout = new JobRetryScheduledError(
      new DocumentConversionTimeoutError('report.docx'),
    );

    expect(documentRetryDelayMs(1, timeout)).toBe(30_000);
    expect(documentRetryDelayMs(2, timeout)).toBe(30_000);
  });

  it('keeps the standard spacing for every other failure', () => {
    const transient = new JobRetryScheduledError(new Error('socket hang up'));

    expect(documentRetryDelayMs(1, transient)).toBe(5_000);
    expect(documentRetryDelayMs(2, transient)).toBe(10_000);
    expect(documentRetryDelayMs(1)).toBe(5_000);
  });

  // A 503 that is neither the time limit nor a full queue (a proxy while the
  // converter restarts) says nothing about minutes of load.
  it('keeps the standard spacing for a converter outage that is not a full queue', () => {
    const outage = new JobRetryScheduledError(
      new DocumentConversionUnavailableError('report.docx'),
    );

    expect(documentRetryDelayMs(1, outage)).toBe(5_000);
    expect(documentRetryDelayMs(2, outage)).toBe(10_000);
  });
});

describe('classifyJobFailure', () => {
  beforeEach(() => jest.clearAllMocks());

  const providerError = new Error(
    'API error occurred: Status 400 - File could not be fetched from url',
  );

  describe('unexpected failures', () => {
    it('wraps in JobRetryScheduledError when a retry will follow', () => {
      const { final, rethrow } = classifyJobFailure(
        jobWith(0, 3),
        providerError,
      );

      expect(final).toBe(false);
      expect(rethrow).toBeInstanceOf(JobRetryScheduledError);
      expect((rethrow as Error).name).toBe('JobRetryScheduledError');
    });

    it('preserves message, stack and cause so job.failedReason stays informative', () => {
      const { rethrow } = classifyJobFailure(jobWith(0, 3), providerError);

      expect((rethrow as Error).message).toBe(providerError.message);
      expect((rethrow as Error).stack).toBe(providerError.stack);
      expect((rethrow as Error).cause).toBe(providerError);
    });

    it('rethrows the original error on the final attempt, so it opens an incident', () => {
      const { final, rethrow } = classifyJobFailure(
        jobWith(2, 3),
        providerError,
      );

      expect(final).toBe(true);
      expect(rethrow).toBe(providerError);
    });

    it('treats UnrecoverableError as final even when attempts remain', () => {
      const unrecoverable = new Error('source was deleted mid-processing');
      unrecoverable.name = 'UnrecoverableError';

      const { final, rethrow } = classifyJobFailure(
        jobWith(0, 3),
        unrecoverable,
      );

      expect(final).toBe(true);
      expect(rethrow).toBe(unrecoverable);
    });

    it('wraps non-Error throwables with a stringified message', () => {
      const { rethrow } = classifyJobFailure(jobWith(0, 3), 'redis timeout');

      expect(rethrow).toBeInstanceOf(JobRetryScheduledError);
      expect((rethrow as Error).message).toBe('redis timeout');
    });
  });

  describe('expected failures', () => {
    it('settles a permanent failure immediately, without an incident', () => {
      const { final, rethrow } = classifyJobFailure(
        jobWith(0, 3),
        new FakeRetrieverError(422),
      );

      expect(final).toBe(true);
      expect(rethrow).toBeNull();
    });

    it.each([413, 415, 404])(
      'skips the remaining retries for status %i',
      (status) => {
        expect(
          classifyJobFailure(jobWith(0, 3), new FakeRetrieverError(status)),
        ).toEqual({ final: true, rethrow: null });
      },
    );

    it.each([408, 429])(
      'keeps retrying status %i under the ignored name, since it may succeed later',
      (status) => {
        const { final, rethrow } = classifyJobFailure(
          jobWith(0, 3),
          new FakeRetrieverError(status),
        );

        expect(final).toBe(false);
        expect(rethrow).toBeInstanceOf(JobRetryScheduledError);
      },
    );

    it('settles a retryable failure quietly once its attempts run out', () => {
      const { final, rethrow } = classifyJobFailure(
        jobWith(2, 3),
        new FakeRetrieverError(408),
      );

      expect(final).toBe(true);
      expect(rethrow).toBeNull();
    });
  });

  // The queue cannot see whether the converter was loaded, so one timeout is
  // not yet proof against the document; two in a row are (AYC-1741).
  describe('conversion timeouts', () => {
    const timeout = new DocumentConversionTimeoutError('report.docx');

    it('retries the first timeout', () => {
      const { final, rethrow } = classifyJobFailure(jobWith(0, 3), timeout);

      expect(final).toBe(false);
      expect(rethrow).toBeInstanceOf(JobRetryScheduledError);
    });

    it('settles the document when the retry times out too', () => {
      expect(
        classifyJobFailure(jobWith(1, 3, timeout.message), timeout),
      ).toEqual({ final: true, rethrow: null });
    });

    it('retries a first timeout that follows a busy converter', () => {
      const busy = new DocumentConverterBusyError('report.docx');

      const { final, rethrow } = classifyJobFailure(
        jobWith(1, 3, busy.message),
        timeout,
      );

      expect(final).toBe(false);
      expect(rethrow).toBeInstanceOf(JobRetryScheduledError);
    });

    it('settles a timeout on the last attempt', () => {
      const busy = new DocumentConverterBusyError('report.docx');

      expect(classifyJobFailure(jobWith(2, 3, busy.message), timeout)).toEqual({
        final: true,
        rethrow: null,
      });
    });
  });

  describe('deterministic provider rejections', () => {
    // A provider 4xx rejection is deterministic — re-sending the same
    // document produces the same rejection, so the remaining attempts only
    // repeat the upstream call. It is still unexpected (502 by
    // construction), so it is rethrown once for its
    // PROVIDER_UNAVAILABLE_REJECTED_* incident (AYC-655).
    it('fails immediately, skipping pointless retries', () => {
      const rejection = new ProviderRequestRejectedError(
        { provider: 'mistral', upstreamStatus: 422 },
        new Error('document rejected'),
      );

      const { final, rethrow } = classifyJobFailure(jobWith(0, 3), rejection);

      expect(final).toBe(true);
      expect(rethrow).not.toBeNull();
      expect((rethrow as Error).message).toBe(rejection.message);
    });

    // Settling before the last attempt only sticks when BullMQ also stops
    // scheduling: it treats only errors NAMED UnrecoverableError as terminal,
    // while AppSignal's queue path groups by `code` — the rethrow must
    // satisfy both, or attempts 2-3 run against an already-failed source.
    it('rethrows under the BullMQ-terminal name while keeping the grouping code', () => {
      const rejection = new ProviderRequestRejectedError(
        { provider: 'mistral', upstreamStatus: 422 },
        new Error('document rejected'),
      );

      const { rethrow } = classifyJobFailure(jobWith(0, 3), rejection);

      expect((rethrow as Error).name).toBe('UnrecoverableError');
      expect((rethrow as Error & { code?: string }).code).toBe(
        'PROVIDER_UNAVAILABLE_REJECTED_MISTRAL',
      );
      expect((rethrow as Error).cause).toBe(rejection);
    });

    it('rethrows the original error unchanged on the final attempt', () => {
      const rejection = new ProviderRequestRejectedError(
        { provider: 'mistral', upstreamStatus: 422 },
        new Error('document rejected'),
      );

      const { final, rethrow } = classifyJobFailure(jobWith(2, 3), rejection);

      expect(final).toBe(true);
      expect(rethrow).toBe(rejection);
    });

    it('does not increment when a worker retry remains and the operation can recover', () => {
      const timeout = new ProviderTimeoutError({ provider: 'mistral' });

      const { final, rethrow } = classifyJobFailure(jobWith(0, 3), timeout);

      expect(final).toBe(false);
      expect(rethrow).toBeInstanceOf(JobRetryScheduledError);
      expect(incrementCounter).not.toHaveBeenCalledWith(
        'provider_unavailable_count',
        expect.anything(),
        expect.anything(),
      );
    });

    it('increments once with only the provider tag after worker retries are exhausted', () => {
      const timeout = new ProviderTimeoutError({ provider: 'mistral' });

      classifyJobFailure(jobWith(0, 3), timeout);
      classifyJobFailure(jobWith(2, 3), timeout);

      expect(
        incrementCounter.mock.calls.filter(
          ([name]) => name === 'provider_unavailable_count',
        ),
      ).toHaveLength(1);
      expect(incrementCounter).toHaveBeenCalledWith(
        'provider_unavailable_count',
        1,
        { provider: 'mistral' },
      );
    });

    // 429 says nothing about the input (Mistral maps persistent rate limits
    // into the REJECTED class too) and a 404 from OCR is files-API eventual
    // consistency the handler itself treats as transient — both must keep
    // the spaced queue retries instead of settling on the first attempt.
    it.each([404, 429])(
      'still retries provider rejections carrying status %i',
      (status) => {
        const rejection = new ProviderRequestRejectedError(
          { provider: 'mistral', upstreamStatus: status },
          new Error(`rejected with ${status}`),
        );

        const { final, rethrow } = classifyJobFailure(jobWith(0, 3), rejection);

        expect(final).toBe(false);
        expect(rethrow).toBeInstanceOf(JobRetryScheduledError);
      },
    );
  });
});
