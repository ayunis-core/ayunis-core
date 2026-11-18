import {
  ProviderConnectionError,
  ProviderRequestRejectedError,
  ProviderServerError,
} from 'src/common/errors/provider.errors';
import { outagePauseEnd } from './sync-schedule';

describe('outagePauseEnd', () => {
  const now = new Date('2026-11-18T10:00:00.000Z');
  const minutesLater = (pauseEnd: Date | null) =>
    pauseEnd && (pauseEnd.getTime() - now.getTime()) / 60_000;
  const outage = new ProviderServerError({
    provider: 'mistral',
    upstreamStatus: 503,
  });

  it('pauses twice as long each time a job meets an outage, starting at a minute', () => {
    expect(
      [0, 1, 2, 5].map((pauses) =>
        minutesLater(outagePauseEnd(outage, pauses, now)),
      ),
    ).toEqual([1, 2, 4, 32]);
  });

  it('waits as long as a rate-limiting provider asks, but at most an hour', () => {
    const rateLimited = (retryAfterMs: number) =>
      new ProviderRequestRejectedError({
        provider: 'mistral',
        upstreamStatus: 429,
        retryAfterMs,
      });

    expect(minutesLater(outagePauseEnd(rateLimited(90_000), 0, now))).toBe(1.5);
    expect(
      minutesLater(outagePauseEnd(rateLimited(5 * 60 * 60_000), 0, now)),
    ).toBe(60);
  });

  it('never retries at once when a provider asks to retry immediately', () => {
    const retryNow = new ProviderRequestRejectedError({
      provider: 'mistral',
      upstreamStatus: 429,
      retryAfterMs: 0,
    });

    expect(outagePauseEnd(retryNow, 0, now)?.getTime()).toBe(
      now.getTime() + 1_000,
    );
  });

  it('pauses for an outage found behind the error the pipeline wraps it in', () => {
    const wrapped = new Error('Indexing failed', {
      cause: new ProviderConnectionError({ provider: 'openai' }),
    });

    expect(minutesLater(outagePauseEnd(wrapped, 0, now))).toBe(1);
  });

  it('does not pause for a request the provider rejects, nor for a failure of ours', () => {
    const rejected = new ProviderRequestRejectedError({
      provider: 'mistral',
      upstreamStatus: 400,
    });

    expect(outagePauseEnd(rejected, 0, now)).toBeNull();
    expect(outagePauseEnd(new Error('bug'), 0, now)).toBeNull();
  });

  it('stops pausing a job after six pauses, about an hour, so it fails as usual', () => {
    expect(outagePauseEnd(outage, 6, now)).toBeNull();
  });
});
