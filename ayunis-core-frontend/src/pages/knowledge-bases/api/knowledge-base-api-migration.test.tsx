import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateKnowledgeBase } from './useCreateKnowledgeBase';

const { request, invalidate } = vi.hoisted(() => ({
  request: vi.fn(),
  invalidate: vi.fn(),
}));
vi.mock('@/shared/api/client', () => ({ customAxiosInstance: request }));
vi.mock('@/shared/lib/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  invalidate.mockResolvedValue(undefined);
});
afterEach(cleanup);

describe('personal knowledge-base API migration', () => {
  it('creates an explicitly personal knowledge base', async () => {
    request.mockResolvedValue({ id: 'personal-kb' });
    const { result } = renderHook(() => useCreateKnowledgeBase(), { wrapper });

    await act(() =>
      result.current.createKnowledgeBase({
        name: 'Personal notes',
        description: 'Reference material',
      }),
    );

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/knowledge-bases',
        method: 'POST',
        data: {
          ownerType: 'personal',
          name: 'Personal notes',
          description: 'Reference material',
        },
      }),
    );
  });
});
