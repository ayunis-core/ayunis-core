import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreatedArtifactId } from './useCreatedArtifactId';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock('@/shared/api/client', () => ({ customAxiosInstance: request }));

const THREAD_ID = 'thread-id';
const ARTIFACT = {
  id: 'artifact-id',
  title: 'Report',
  type: 'document',
  createdAt: '2026-01-01T00:00:00.000Z',
};

let client: QueryClient;
let artifacts: (typeof ARTIFACT)[];

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 5 * 60 * 1000 } },
  });
  artifacts = [];
  request.mockImplementation(async ({ url }: { url: string }) =>
    url === `/artifacts/thread/${THREAD_ID}` ? artifacts : undefined,
  );
});

afterEach(() => {
  cleanup();
  client.clear();
});

describe('useCreatedArtifactId', () => {
  it('resolves the artifact as soon as the create tool result arrives, before the run ends', async () => {
    const { result, rerender } = renderHook(
      ({ toolResult }: { toolResult?: string }) =>
        useCreatedArtifactId({
          threadId: THREAD_ID,
          title: 'Report',
          type: 'document',
          result: toolResult,
        }),
      { wrapper, initialProps: {} },
    );
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    expect(result.current).toBeNull();

    artifacts = [ARTIFACT];
    rerender({ toolResult: 'Document created successfully.' });

    await waitFor(() => expect(result.current).toBe('artifact-id'));
  });
});
