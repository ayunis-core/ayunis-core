import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useModulePageTimeHeartbeat } from './useModulePageTimeHeartbeat';

const { recordHeartbeat } = vi.hoisted(() => ({ recordHeartbeat: vi.fn() }));

vi.mock('@/shared/api', () => ({
  academyProgressControllerRecordModuleHeartbeat: recordHeartbeat,
  getAcademyProgressControllerGetProgressQueryKey: () => ['/academy/progress'],
}));

let intersect: (isIntersecting: boolean) => void;

class FakeIntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    intersect = (isIntersecting) =>
      callback(
        [{ isIntersecting } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
  }
  observe() {}
  disconnect() {}
}

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event('visibilitychange'));
}

function render(courseModuleId = 'module-1') {
  const queryClient = new QueryClient();
  const target = { current: document.createElement('div') };
  return renderHook(({ id }) => useModulePageTimeHeartbeat(id, target), {
    initialProps: { id: courseModuleId },
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
}

// Heartbeats are queued so they reach the server in order; let them settle.
async function settle() {
  for (let i = 0; i < 10; i++) {
    await act(async () => undefined);
  }
}

function sessionStarts() {
  return (
    recordHeartbeat.mock.calls as [string, { sessionStart: boolean }][]
  ).map(([, body]) => body.sessionStart);
}

describe('useModulePageTimeHeartbeat', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
    recordHeartbeat.mockReset().mockResolvedValue(undefined);
    setVisibility('visible');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('starts a session when the player is visible, then beats every 15 s', async () => {
    render();
    act(() => intersect(true));
    act(() => vi.advanceTimersByTime(30_000));
    await settle();

    expect(recordHeartbeat).toHaveBeenCalledWith('module-1', {
      sessionStart: true,
    });
    expect(sessionStarts()).toEqual([true, false, false]);
  });

  it('records nothing while the player is scrolled out of view', async () => {
    render();
    act(() => intersect(false));
    act(() => vi.advanceTimersByTime(60_000));
    await settle();

    expect(recordHeartbeat).not.toHaveBeenCalled();
  });

  it('credits the partial interval and stops when the tab is hidden', async () => {
    render();
    act(() => intersect(true));
    act(() => vi.advanceTimersByTime(5_000));
    act(() => setVisibility('hidden'));
    act(() => vi.advanceTimersByTime(60_000));
    await settle();

    expect(sessionStarts()).toEqual([true, false]);

    act(() => setVisibility('visible'));
    await settle();
    expect(sessionStarts()).toEqual([true, false, true]);
  });

  it('closes the session for the old module when switching modules', async () => {
    const { rerender, unmount } = render('module-1');
    act(() => intersect(true));
    rerender({ id: 'module-2' });
    act(() => intersect(true));
    unmount();
    await settle();

    expect(recordHeartbeat.mock.calls).toEqual([
      ['module-1', { sessionStart: true }],
      ['module-1', { sessionStart: false }],
      ['module-2', { sessionStart: true }],
      ['module-2', { sessionStart: false }],
    ]);
  });

  it('sends the closing heartbeat before starting the next module', async () => {
    let finishClosingBeat: () => void = () => undefined;
    const { rerender } = render('module-1');
    act(() => intersect(true));
    await settle();
    recordHeartbeat.mockImplementationOnce(
      () => new Promise<void>((resolve) => (finishClosingBeat = resolve)),
    );

    rerender({ id: 'module-2' });
    act(() => intersect(true));
    await settle();
    expect(recordHeartbeat.mock.calls).toEqual([
      ['module-1', { sessionStart: true }],
      ['module-1', { sessionStart: false }],
    ]);

    finishClosingBeat();
    await settle();
    expect(recordHeartbeat).toHaveBeenLastCalledWith('module-2', {
      sessionStart: true,
    });
  });

  it('keeps heartbeat order when the player remounts for the next module', async () => {
    let finishClosingBeat: () => void = () => undefined;
    const first = render('module-1');
    act(() => intersect(true));
    await settle();
    recordHeartbeat.mockImplementationOnce(
      () => new Promise<void>((resolve) => (finishClosingBeat = resolve)),
    );

    first.unmount();
    render('module-2');
    act(() => intersect(true));
    await settle();
    expect(recordHeartbeat).toHaveBeenLastCalledWith('module-1', {
      sessionStart: false,
    });

    finishClosingBeat();
    await settle();
    expect(recordHeartbeat).toHaveBeenLastCalledWith('module-2', {
      sessionStart: true,
    });
  });
});
