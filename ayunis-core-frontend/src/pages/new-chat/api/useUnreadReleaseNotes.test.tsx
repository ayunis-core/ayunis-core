import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUnreadReleaseNotes } from './useUnreadReleaseNotes';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock('@ayunis/api-client/request', () => ({ customAxiosInstance: request }));

let client: QueryClient;
let releaseNotes: { headline: string; unread: boolean }[];

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function renderTab() {
  return renderHook(() => useUnreadReleaseNotes(), { wrapper });
}

function headlines(result: {
  current: ReturnType<typeof useUnreadReleaseNotes>;
}) {
  return result.current.releaseNotes.map((note) => note.headline);
}

beforeEach(() => {
  // The app-wide default, under which a cached list would be reused as is.
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 5 * 60 * 1000 } },
  });
  releaseNotes = [
    { headline: 'Routinen im Video', unread: true },
    { headline: 'Routinen sind da', unread: false },
    { headline: 'Neue Modelle', unread: true },
  ];
  request.mockImplementation(async ({ url }: { url: string }) => {
    if (url !== '/release-notes') return { count: 0 };
    return releaseNotes.map((note, i) => ({ id: `note-${i}`, ...note }));
  });
});

afterEach(() => {
  cleanup();
  client.clear();
});

describe('useUnreadReleaseNotes', () => {
  it('lists only the product updates the user has not opened, newest first', async () => {
    const { result } = renderTab();

    await waitFor(() =>
      expect(headlines(result)).toEqual(['Routinen im Video', 'Neue Modelle']),
    );
  });

  it('refetches a tab that is opened again, so an update opened since is gone', async () => {
    const first = renderTab();
    await waitFor(() =>
      expect(headlines(first.result)).toEqual([
        'Routinen im Video',
        'Neue Modelle',
      ]),
    );
    first.unmount();

    releaseNotes[0].unread = false;
    const again = renderTab();

    await waitFor(() =>
      expect(headlines(again.result)).toEqual(['Neue Modelle']),
    );
  });
});
