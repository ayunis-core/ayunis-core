import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useKnowledgeBases } from './useKnowledgeBases';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@/shared/api/client', () => ({ customAxiosInstance: request }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('useKnowledgeBases', () => {
  it('lists the personal scope and unwraps the paginated response', async () => {
    request.mockResolvedValue({
      data: [{ id: 'personal-kb', name: 'Personal notes' }],
      pagination: { limit: 1, offset: 0, total: 1 },
    });

    const { result } = renderHook(() => useKnowledgeBases(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/knowledge-bases',
        params: { ownerType: 'personal' },
      }),
    );
    expect(result.current.knowledgeBases).toEqual([
      expect.objectContaining({ id: 'personal-kb' }),
    ]);
  });
});
