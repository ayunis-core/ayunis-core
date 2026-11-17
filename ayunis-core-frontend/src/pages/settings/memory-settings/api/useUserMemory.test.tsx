import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useUserMemory } from './useUserMemory';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock('@/shared/api/client', () => ({ customAxiosInstance: request }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/shared/lib/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

const client = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

afterEach(() => {
  cleanup();
  client.clear();
});

const personal = {
  key: 'personal',
  content: 'Works in the building authority',
  description: null,
  isReserved: true,
  updatedAt: '2026-11-01T10:00:00.000Z',
};

// Query observers notify on the next macrotask.
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('useUserMemory', () => {
  it('shows a successful save even when the refetch after it fails', async () => {
    const saved = {
      ...personal,
      content: 'Heads the building authority',
      updatedAt: '2026-11-02T10:00:00.000Z',
    };
    request.mockResolvedValueOnce({ entries: [personal] });
    const { result } = renderHook(() => useUserMemory(), { wrapper });
    await waitFor(() => expect(result.current.entries).toEqual([personal]));

    request
      .mockResolvedValueOnce(saved)
      .mockRejectedValueOnce(new Error('network down'));
    await act(async () => {
      await result.current.saveEntry('personal', saved.content);
      await settle();
    });

    expect(result.current.entries).toEqual([saved]);
  });

  it('keeps a cleared reserved key listed even when the refetch after it fails', async () => {
    request.mockResolvedValueOnce({ entries: [personal] });
    const { result } = renderHook(() => useUserMemory(), { wrapper });
    await waitFor(() => expect(result.current.entries).toEqual([personal]));

    request
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('network down'));
    await act(async () => {
      await result.current.saveEntry('personal', '  ');
      await settle();
    });

    expect(result.current.entries).toEqual([
      { ...personal, content: '', updatedAt: null },
    ]);
  });

  it('keeps the loaded entries when a refetch fails, so open drafts stay mounted', async () => {
    const entries = [personal];
    request.mockResolvedValueOnce({ entries });
    const { result } = renderHook(() => useUserMemory(), { wrapper });
    await waitFor(() => expect(result.current.entries).toEqual(entries));

    request.mockRejectedValueOnce(new Error('network down'));
    await act(async () => {
      await result.current.refetch();
      await settle();
    });

    expect(result.current.hasLoadFailed).toBe(false);
    expect(result.current.entries).toEqual(entries);
  });

  it('does not clear memory while a save is in flight, so the saved entry cannot reappear', async () => {
    request.mockResolvedValueOnce({ entries: [personal] });
    const { result } = renderHook(() => useUserMemory(), { wrapper });
    await waitFor(() => expect(result.current.entries).toEqual([personal]));

    request.mockReset();
    request.mockReturnValueOnce(new Promise(() => {}));
    act(() => {
      void result.current.saveEntry('personal', 'Heads the building authority');
    });
    await waitFor(() => expect(result.current.isSaving).toBe(true));

    act(() => result.current.clearMemory());
    await act(settle);

    expect(request).not.toHaveBeenCalledWith(
      expect.objectContaining({ url: '/memory', method: 'DELETE' }),
    );
  });

  it('reports a failed first load', async () => {
    request.mockRejectedValueOnce(new Error('network down'));
    const { result } = renderHook(() => useUserMemory(), { wrapper });

    await waitFor(() => expect(result.current.hasLoadFailed).toBe(true));
  });
});
