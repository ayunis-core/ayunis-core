import type { Job } from 'bullmq';
import {
  isFinalAttempt,
  isExpectedFailure,
  classifyJobFailure,
  JobRetryScheduledError,
} from './bullmq-job.helpers';
import { ApplicationError } from 'src/common/errors/base.error';
import {
  ProviderRequestRejectedError,
  ProviderTimeoutError,
} from 'src/common/errors/provider.errors';

function jobWith(attemptsMade: number, attempts?: number): Job {
  return { attemptsMade, opts: { attempts } } as Job;
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

describe('classifyJobFailure', () => {
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

    it('still retries provider timeouts, which may succeed later', () => {
      const timeout = new ProviderTimeoutError({ provider: 'mistral' });

      const { final, rethrow } = classifyJobFailure(jobWith(0, 3), timeout);

      expect(final).toBe(false);
      expect(rethrow).toBeInstanceOf(JobRetryScheduledError);
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
