import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFrameCoalescer } from './frame-coalescer';

interface Snapshot {
  id: string;
  text: string;
}

describe('createFrameCoalescer', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['requestAnimationFrame', 'cancelAnimationFrame'],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function setup() {
    const onFlush = vi.fn<(items: Snapshot[]) => void>();
    const coalescer = createFrameCoalescer<Snapshot>(
      (item) => item.id,
      onFlush,
    );
    return { coalescer, onFlush };
  }

  it('applies everything pushed within a frame once, keeping the latest per key', () => {
    const { coalescer, onFlush } = setup();

    coalescer.push({ id: 'a', text: 'H' });
    coalescer.push({ id: 'b', text: 'Tool' });
    coalescer.push({ id: 'a', text: 'Hallo' });
    expect(onFlush).not.toHaveBeenCalled();

    vi.advanceTimersToNextFrame();

    expect(onFlush).toHaveBeenCalledOnce();
    expect(onFlush).toHaveBeenCalledWith([
      { id: 'a', text: 'Hallo' },
      { id: 'b', text: 'Tool' },
    ]);
  });

  it('schedules a new frame for items pushed after a flush', () => {
    const { coalescer, onFlush } = setup();

    coalescer.push({ id: 'a', text: 'H' });
    vi.advanceTimersToNextFrame();
    coalescer.push({ id: 'a', text: 'Ha' });
    vi.advanceTimersToNextFrame();

    expect(onFlush).toHaveBeenCalledTimes(2);
    expect(onFlush).toHaveBeenLastCalledWith([{ id: 'a', text: 'Ha' }]);
  });

  it('delivers pending items synchronously on flush and skips the scheduled frame', () => {
    const { coalescer, onFlush } = setup();

    coalescer.push({ id: 'a', text: 'Final' });
    coalescer.flush();
    expect(onFlush).toHaveBeenCalledWith([{ id: 'a', text: 'Final' }]);

    vi.advanceTimersToNextFrame();
    expect(onFlush).toHaveBeenCalledOnce();
  });

  it('does nothing when flushed without pending items', () => {
    const { coalescer, onFlush } = setup();

    coalescer.flush();
    vi.advanceTimersToNextFrame();

    expect(onFlush).not.toHaveBeenCalled();
  });
});
