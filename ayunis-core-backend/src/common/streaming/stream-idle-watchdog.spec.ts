import { StreamIdleWatchdog } from './stream-idle-watchdog';

describe('StreamIdleWatchdog', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('stays disarmed until the caller arms it', () => {
    const onStall = jest.fn();
    const watchdog = new StreamIdleWatchdog(1000, onStall);

    jest.advanceTimersByTime(10_000);

    expect(onStall).not.toHaveBeenCalled();
    watchdog.stop();
  });

  it('arms with a one-off budget for the first chunk', () => {
    const onStall = jest.fn();
    const watchdog = new StreamIdleWatchdog(1000, onStall);

    watchdog.arm(5000);
    jest.advanceTimersByTime(4999);
    expect(onStall).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(onStall).toHaveBeenCalledTimes(1);
  });

  it('falls back to the idle budget once a chunk arrives after the initial arm', () => {
    const onStall = jest.fn();
    const watchdog = new StreamIdleWatchdog(1000, onStall);

    watchdog.arm(5000);
    jest.advanceTimersByTime(4000);
    watchdog.notifyChunk();
    jest.advanceTimersByTime(1000);

    expect(onStall).toHaveBeenCalledTimes(1);
  });

  it('fires once the gap after a chunk exceeds the idle budget', () => {
    const onStall = jest.fn();
    const watchdog = new StreamIdleWatchdog(1000, onStall);

    watchdog.notifyChunk();
    jest.advanceTimersByTime(1000);

    expect(onStall).toHaveBeenCalledTimes(1);
  });

  it('does not fire while chunks keep arriving inside the budget', () => {
    const onStall = jest.fn();
    const watchdog = new StreamIdleWatchdog(1000, onStall);

    for (let i = 0; i < 10; i++) {
      watchdog.notifyChunk();
      jest.advanceTimersByTime(900);
    }

    expect(onStall).not.toHaveBeenCalled();
  });

  it('measures the gap since the last chunk, not since the stream started', () => {
    const onStall = jest.fn();
    const watchdog = new StreamIdleWatchdog(1000, onStall);

    watchdog.notifyChunk();
    jest.advanceTimersByTime(900);
    watchdog.notifyChunk();
    jest.advanceTimersByTime(900);

    expect(onStall).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);
    expect(onStall).toHaveBeenCalledTimes(1);
  });

  it('stops firing once the stream ends', () => {
    const onStall = jest.fn();
    const watchdog = new StreamIdleWatchdog(1000, onStall);

    watchdog.notifyChunk();
    watchdog.stop();
    jest.advanceTimersByTime(10_000);

    expect(onStall).not.toHaveBeenCalled();
  });
});
