import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAdventClock } from './useAdventClock';

const SERVER_NOW = '2026-12-10T23:59:50+01:00';
const NEXT_OPENING = Date.parse('2026-12-11T00:00:00+01:00');
// The browser's own clock is a day and a bit behind the server.
const BROWSER_NOW = Date.parse('2026-12-09T20:00:00+01:00');

describe('useAdventClock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BROWSER_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('follows the server time when the browser clock is wrong', () => {
    const { result } = renderHook(() =>
      useAdventClock({
        serverNow: SERVER_NOW,
        receivedAt: BROWSER_NOW,
        nextOpening: NEXT_OPENING,
        onDue: vi.fn(),
      }),
    );
    expect(result.current).toBe(Date.parse(SERVER_NOW));

    act(() => vi.advanceTimersByTime(3000));
    expect(result.current).toBe(Date.parse(SERVER_NOW) + 3000);
  });

  it('reloads the calendar once when the next door is due by server time', () => {
    const onDue = vi.fn();
    renderHook(() =>
      useAdventClock({
        serverNow: SERVER_NOW,
        receivedAt: BROWSER_NOW,
        nextOpening: NEXT_OPENING,
        onDue,
      }),
    );

    act(() => vi.advanceTimersByTime(9000));
    expect(onDue).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1000));
    expect(onDue).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(5000));
    expect(onDue).toHaveBeenCalledTimes(1);
  });

  it('keeps reloading while a failed reload leaves the door locked', () => {
    const onDue = vi.fn();
    renderHook(() =>
      useAdventClock({
        serverNow: SERVER_NOW,
        receivedAt: BROWSER_NOW,
        nextOpening: NEXT_OPENING,
        onDue,
      }),
    );
    act(() => vi.advanceTimersByTime(10_000));
    expect(onDue).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(30_000));
    expect(onDue).toHaveBeenCalledTimes(2);
  });

  it('reloads again when the reloaded calendar still has the door ahead', () => {
    const onDue = vi.fn();
    const { rerender } = renderHook(
      ({ serverNow, receivedAt }) =>
        useAdventClock({
          serverNow,
          receivedAt,
          nextOpening: NEXT_OPENING,
          onDue,
        }),
      { initialProps: { serverNow: SERVER_NOW, receivedAt: BROWSER_NOW } },
    );
    act(() => vi.advanceTimersByTime(10_000));
    expect(onDue).toHaveBeenCalledTimes(1);

    // The server answered just before midnight, so the door is still locked.
    rerender({
      serverNow: '2026-12-10T23:59:59.500+01:00',
      receivedAt: Date.now(),
    });
    act(() => vi.advanceTimersByTime(1000));
    expect(onDue).toHaveBeenCalledTimes(2);
  });

  it('never reloads while no door is locked', () => {
    const onDue = vi.fn();
    renderHook(() =>
      useAdventClock({
        serverNow: SERVER_NOW,
        receivedAt: BROWSER_NOW,
        nextOpening: null,
        onDue,
      }),
    );
    act(() => vi.advanceTimersByTime(60_000));
    expect(onDue).not.toHaveBeenCalled();
  });
});
