import type { Job } from 'bullmq';
import {
  isFinalAttempt,
  wrapIfRetryScheduled,
  JobRetryScheduledError,
} from './bullmq-job.helpers';

function jobWith(attemptsMade: number, attempts?: number): Job {
  return { attemptsMade, opts: { attempts } } as Job;
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

describe('wrapIfRetryScheduled', () => {
  const providerError = new Error(
    'API error occurred: Status 400 - File could not be fetched from url',
  );

  it('wraps the error in JobRetryScheduledError when a retry will follow', () => {
    const result = wrapIfRetryScheduled(jobWith(0, 3), providerError);

    expect(result).toBeInstanceOf(JobRetryScheduledError);
    expect((result as Error).name).toBe('JobRetryScheduledError');
  });

  it('preserves the original message so job.failedReason stays informative', () => {
    const result = wrapIfRetryScheduled(jobWith(0, 3), providerError);

    expect((result as Error).message).toBe(providerError.message);
  });

  it('preserves the original stack and exposes the original as cause', () => {
    const result = wrapIfRetryScheduled(jobWith(0, 3), providerError) as Error;

    expect(result.stack).toBe(providerError.stack);
    expect(result.cause).toBe(providerError);
  });

  it('returns the original error untouched on the final attempt', () => {
    expect(wrapIfRetryScheduled(jobWith(2, 3), providerError)).toBe(
      providerError,
    );
  });

  it('returns UnrecoverableError untouched even when attempts remain, since BullMQ will not retry it', () => {
    const unrecoverable = new Error('source was deleted mid-processing');
    unrecoverable.name = 'UnrecoverableError';

    expect(wrapIfRetryScheduled(jobWith(0, 3), unrecoverable)).toBe(
      unrecoverable,
    );
  });

  it('wraps non-Error throwables with a stringified message', () => {
    const result = wrapIfRetryScheduled(jobWith(0, 3), 'redis timeout');

    expect(result).toBeInstanceOf(JobRetryScheduledError);
    expect((result as Error).message).toBe('redis timeout');
  });
});
