import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { StartupPending } from './StartupPending';

const translations: Record<string, string> = {
  'common.pagePending.title': 'Loading page…',
  'common.pagePending.description': 'This may take a moment.',
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => translations[key] ?? key,
  }),
}));

function createSlowRouter() {
  const gates = new Map<string, () => void>();
  const gate = (path: string) =>
    new Promise<void>((resolve) => gates.set(path, resolve));
  const rootRoute = createRootRoute();
  const routeTree = rootRoute.addChildren(
    ['/', '/chat'].map((path) =>
      createRoute({
        getParentRoute: () => rootRoute,
        path,
        beforeLoad: () => gate(path),
      }),
    ),
  );
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  const open = async (path: string) => {
    await vi.advanceTimersByTimeAsync(0);
    gates.get(path)?.();
  };
  return { router, open };
}

describe(StartupPending.name, () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows after 1s while the first route load is still pending, then clears', async () => {
    const { router, open } = createSlowRouter();
    render(<StartupPending router={router} />);
    const load = router.load();

    await act(() => vi.advanceTimersByTimeAsync(900));
    expect(screen.queryByRole('status')).toBeNull();

    await act(() => vi.advanceTimersByTimeAsync(200));
    expect(screen.getByRole('status').textContent).toContain('Loading page…');

    await act(async () => {
      await open('/');
      await load;
    });
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('stays hidden for a fast first load', async () => {
    const { router, open } = createSlowRouter();
    render(<StartupPending router={router} />);

    await act(async () => {
      const load = router.load();
      await open('/');
      await load;
    });
    await act(() => vi.advanceTimersByTimeAsync(2000));

    expect(screen.queryByRole('status')).toBeNull();
  });

  it('stays hidden for a slow navigation after the app has loaded', async () => {
    const { router, open } = createSlowRouter();
    render(<StartupPending router={router} />);
    await act(async () => {
      const load = router.load();
      await open('/');
      await load;
    });

    const navigation = router.navigate({ to: '/chat' });
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(screen.queryByRole('status')).toBeNull();

    await act(async () => {
      await open('/chat');
      await navigation;
    });
  });
});
