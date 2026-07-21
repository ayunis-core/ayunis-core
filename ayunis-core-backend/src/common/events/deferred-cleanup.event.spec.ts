import { Logger } from '@nestjs/common';
import { DeferredCleanupEvent } from './deferred-cleanup.event';
import { runDeferredCleanup } from './run-deferred-cleanup';

class TestEvent extends DeferredCleanupEvent {}

describe('DeferredCleanupEvent', () => {
  it('collects deferred tasks without running them', () => {
    const event = new TestEvent();
    const run = jest.fn().mockResolvedValue(undefined);

    event.deferCleanup('task', run);

    expect(run).not.toHaveBeenCalled();
    expect(event.takeCleanupTasks()).toEqual([{ label: 'task', run }]);
  });

  it('drains tasks so they can only be taken once', () => {
    const event = new TestEvent();
    event.deferCleanup('task', jest.fn().mockResolvedValue(undefined));

    expect(event.takeCleanupTasks()).toHaveLength(1);
    expect(event.takeCleanupTasks()).toHaveLength(0);
  });
});

describe('runDeferredCleanup', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger('test');
    jest.spyOn(logger, 'error').mockImplementation();
  });

  it('runs all tasks in order', async () => {
    const calls: string[] = [];
    const track = (label: string) =>
      jest.fn(async (): Promise<void> => {
        calls.push(label);
      });
    await runDeferredCleanup(
      [
        { label: 'first', run: track('first') },
        { label: 'second', run: track('second') },
      ],
      logger,
    );

    expect(calls).toEqual(['first', 'second']);
  });

  it('swallows a failing task, logs it, and continues with the rest', async () => {
    const second = jest.fn().mockResolvedValue(undefined);

    await expect(
      runDeferredCleanup(
        [
          {
            label: 'failing',
            run: jest.fn().mockRejectedValue(new Error('boom')),
          },
          { label: 'second', run: second },
        ],
        logger,
      ),
    ).resolves.toBeUndefined();

    expect(second).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith('Deferred cleanup task failed', {
      label: 'failing',
      error: 'boom',
    });
  });
});
