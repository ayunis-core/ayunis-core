import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SourceProcessingHeartbeatService } from './source-processing-heartbeat.service';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((success, failure) => {
    resolve = success;
    reject = failure;
  });
  return { promise, resolve, reject };
}

describe('SourceProcessingHeartbeatService', () => {
  const sourceId = randomUUID();
  let service: SourceProcessingHeartbeatService;
  const repository = { refreshProcessingHeartbeat: jest.fn() };

  beforeEach(() => {
    jest.useFakeTimers();
    repository.refreshProcessingHeartbeat.mockReset().mockResolvedValue(true);
    service = new SourceProcessingHeartbeatService(repository as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('renews active work and leaves no timers after successful completion', async () => {
    const work = deferred<string>();
    const processing = service.run(sourceId, () => work.promise);
    await jest.advanceTimersByTimeAsync(2 * 60 * 1000);
    expect(repository.refreshProcessingHeartbeat).toHaveBeenCalledTimes(2);
    expect(repository.refreshProcessingHeartbeat).toHaveBeenCalledWith(
      sourceId,
    );
    work.resolve('extracted attachment');
    await expect(processing).resolves.toBe('extracted attachment');
    expect(jest.getTimerCount()).toBe(0);
  });

  it('preserves extraction failures and stops renewing before retry', async () => {
    const work = deferred<string>();
    const processing = service.run(sourceId, () => work.promise);
    const failure = new Error('document converter unavailable');
    const assertion = expect(processing).rejects.toBe(failure);
    await jest.advanceTimersByTimeAsync(60 * 1000);
    work.reject(failure);
    await assertion;
    await jest.advanceTimersByTimeAsync(60 * 1000);
    expect(repository.refreshProcessingHeartbeat).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('stops renewing when the conditional update finds no processing source', async () => {
    repository.refreshProcessingHeartbeat.mockResolvedValue(false);
    const work = deferred<string>();
    const processing = service.run(sourceId, () => work.promise);
    await jest.advanceTimersByTimeAsync(3 * 60 * 1000);
    expect(repository.refreshProcessingHeartbeat).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
    work.resolve('finished after deletion');
    await processing;
  });

  it('logs a failed refresh and retries on the next interval', async () => {
    const failure = new Error('database temporarily unavailable');
    repository.refreshProcessingHeartbeat.mockRejectedValueOnce(failure);
    const warning = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const work = deferred<string>();
    const processing = service.run(sourceId, () => work.promise);
    await jest.advanceTimersByTimeAsync(2 * 60 * 1000);
    expect(repository.refreshProcessingHeartbeat).toHaveBeenCalledTimes(2);
    expect(warning).toHaveBeenCalledWith(
      { sourceId, err: failure },
      'Could not refresh source processing heartbeat',
    );
    work.resolve('extracted');
    await processing;
    expect(jest.getTimerCount()).toBe(0);
  });

  it('does not overlap writes and drains an in-flight refresh before returning', async () => {
    const refresh = deferred<boolean>();
    repository.refreshProcessingHeartbeat.mockReturnValue(refresh.promise);
    const work = deferred<string>();
    let completed = false;
    const processing = service
      .run(sourceId, () => work.promise)
      .then(() => {
        completed = true;
      });
    await jest.advanceTimersByTimeAsync(3 * 60 * 1000);
    expect(repository.refreshProcessingHeartbeat).toHaveBeenCalledTimes(1);
    work.resolve('extracted');
    await jest.advanceTimersByTimeAsync(60 * 1000);
    expect(completed).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
    refresh.resolve(true);
    await processing;
    expect(completed).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('keeps concurrent jobs independent when one completes', async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const secondId = randomUUID();
    const firstRun = service.run(sourceId, () => first.promise);
    const secondRun = service.run(secondId, () => second.promise);
    first.resolve('first email');
    await firstRun;
    await jest.advanceTimersByTimeAsync(60 * 1000);
    expect(repository.refreshProcessingHeartbeat.mock.calls).toEqual([
      [secondId],
    ]);
    second.resolve('second email');
    await secondRun;
    expect(jest.getTimerCount()).toBe(0);
  });
});
