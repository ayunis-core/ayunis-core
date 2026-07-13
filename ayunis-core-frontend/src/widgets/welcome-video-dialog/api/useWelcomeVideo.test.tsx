import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWelcomeVideo } from './useWelcomeVideo';

const { markWelcomeVideoSeen, updateOnboarding } = vi.hoisted(() => ({
  markWelcomeVideoSeen: vi.fn(),
  updateOnboarding: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  getOnboardingControllerGetOnboardingQueryKey: () => ['onboarding'],
  onboardingControllerMarkWelcomeVideoSeen: markWelcomeVideoSeen,
  onboardingControllerUpdateOnboarding: updateOnboarding,
  useOnboardingControllerGetOnboarding: () => ({
    data: {
      completedStepIds: [],
      hidden: true,
      welcomeVideoSeenAt: null,
    },
    isLoading: false,
  }),
}));

vi.mock('@/shared/lib/toast', () => ({ showError: vi.fn() }));

describe('useWelcomeVideo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    markWelcomeVideoSeen.mockResolvedValue({
      completedStepIds: [],
      hidden: true,
      welcomeVideoSeenAt: '2026-08-05T12:00:00.000Z',
    });
  });

  it('marks the welcome video as seen without replacing onboarding', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useWelcomeVideo(), { wrapper });

    await act(() => result.current.markSeen());

    await waitFor(() => {
      expect(markWelcomeVideoSeen).toHaveBeenCalledWith();
    });
    expect(updateOnboarding).not.toHaveBeenCalled();
  });

  it('rejects markSeen when persistence fails so the dialog can stay open', async () => {
    markWelcomeVideoSeen.mockRejectedValue(new Error('offline'));
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useWelcomeVideo(), { wrapper });

    await expect(result.current.markSeen()).rejects.toThrow('offline');
  });
});
