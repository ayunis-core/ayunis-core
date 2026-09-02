import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
});
