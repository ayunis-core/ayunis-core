import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotificationType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useUnreadNotifications } from './useUnreadNotifications';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock('@/shared/api/client', () => ({ customAxiosInstance: request }));

let client: QueryClient;
let unreadRoutineHeadlines: string[];

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function renderTab(type: NotificationType) {
  return renderHook(() => useUnreadNotifications(type), { wrapper });
}

function headlines(result: {
  current: ReturnType<typeof useUnreadNotifications>;
}) {
  return result.current.notifications.map((n) => n.headline);
}

beforeEach(() => {
  // The app-wide default, under which a cached list would be reused as is.
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 5 * 60 * 1000 } },
  });
  unreadRoutineHeadlines = ['Neue Verordnung'];
  request.mockImplementation(
    async ({ url, params }: { url: string; params?: { type?: string } }) => {
      if (url !== '/notifications') return { count: 0, byType: [] };
      const data =
        params?.type === 'routine'
          ? unreadRoutineHeadlines.map((headline, i) => ({
              id: `routine-${i}`,
              type: 'routine',
              headline,
            }))
          : [];
      return { data, pagination: { total: data.length } };
    },
  );
});

afterEach(() => {
  cleanup();
  client.clear();
});

describe('useUnreadNotifications', () => {
  it('refetches a tab that is opened again, so its list matches its live count', async () => {
    const first = renderTab('routine');
    await waitFor(() =>
      expect(headlines(first.result)).toEqual(['Neue Verordnung']),
    );
    first.unmount();

    // A routine posts another notification while another tab is open.
    unreadRoutineHeadlines = ['Pressespiegel', 'Neue Verordnung'];
    const again = renderTab('routine');

    await waitFor(() =>
      expect(headlines(again.result)).toEqual([
        'Pressespiegel',
        'Neue Verordnung',
      ]),
    );
  });
});
