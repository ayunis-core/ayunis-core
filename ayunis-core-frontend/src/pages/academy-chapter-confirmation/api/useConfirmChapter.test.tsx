import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import { showError } from '@/shared/lib/toast';
import { useConfirmChapter } from './useConfirmChapter';

const { confirmChapter, navigate, routerInvalidate } = vi.hoisted(() => ({
  confirmChapter: vi.fn(),
  navigate: vi.fn(),
  routerInvalidate: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
  useRouter: () => ({ invalidate: routerInvalidate }),
}));

vi.mock('@/shared/api', () => ({
  academyChaptersControllerConfirmChapter: confirmChapter,
  getAcademyProgressControllerGetProgressQueryKey: () => ['/academy/progress'],
  getAcademyAccessControllerGetStatusQueryKey: () => ['/academy-access/status'],
}));

vi.mock('@/shared/lib/toast', () => ({ showError: vi.fn() }));

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('useConfirmChapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    confirmChapter.mockResolvedValue({
      chapterId: 'chapter-id',
      confirmedAt: '2026-08-27T10:00:00.000Z',
      academyCompleted: true,
    });
    navigate.mockResolvedValue(undefined);
    routerInvalidate.mockResolvedValue(undefined);
  });

  it('refreshes progress and access before returning to the academy', async () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi
      .spyOn(queryClient, 'invalidateQueries')
      .mockResolvedValue(undefined);
    const { result } = renderHook(() => useConfirmChapter('chapter-id'), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.confirmChapter();
    });

    expect(confirmChapter).toHaveBeenCalledWith('chapter-id');
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['/academy/progress'],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['/academy-access/status'],
    });
    expect(routerInvalidate).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith({ to: '/academy' });
  });

  it('explains and refreshes progress when video pages are still short', async () => {
    confirmChapter.mockRejectedValue(
      new AxiosError('Conflict', '409', undefined, undefined, {
        status: 409,
        statusText: 'Conflict',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: { code: 'MODULES_BELOW_MINIMUM_TIME', message: 'short' },
      }),
    );
    const queryClient = new QueryClient();
    const invalidateQueries = vi
      .spyOn(queryClient, 'invalidateQueries')
      .mockResolvedValue(undefined);
    const { result } = renderHook(() => useConfirmChapter('chapter-id'), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.confirmChapter().catch(() => undefined);
    });

    expect(showError).toHaveBeenCalledWith(
      'confirmation.errors.modulesBelowMinimumTime',
    );
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['/academy/progress'],
    });
    expect(navigate).not.toHaveBeenCalled();
  });
});
