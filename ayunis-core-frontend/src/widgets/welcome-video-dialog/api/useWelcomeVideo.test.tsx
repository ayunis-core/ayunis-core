import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWelcomeVideo } from './useWelcomeVideo';

const { markWelcomeVideoSeen, updateOnboarding, client, onboarding } =
  vi.hoisted(() => ({
    markWelcomeVideoSeen: vi.fn(),
    updateOnboarding: vi.fn(),
    client: { track: vi.fn() },
    onboarding: {
      current: {
        completedStepIds: [] as string[],
        hidden: true,
        welcomeVideoSeenAt: null as string | null,
      },
    },
  }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  getOnboardingControllerGetOnboardingQueryKey: () => ['onboarding'],
  onboardingControllerMarkWelcomeVideoSeen: markWelcomeVideoSeen,
  onboardingControllerUpdateOnboarding: updateOnboarding,
  useOnboardingControllerGetOnboarding: () => ({
    data: onboarding.current,
    isLoading: false,
  }),
}));

vi.mock('@/shared/lib/openpanel', () => ({ openPanel: client }));
vi.mock('@/shared/lib/toast', () => ({ showError: vi.fn() }));

function renderUseWelcomeVideo() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useWelcomeVideo(), { wrapper }).result;
}

describe('useWelcomeVideo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.track.mockResolvedValue(undefined);
    onboarding.current = {
      completedStepIds: [],
      hidden: true,
      welcomeVideoSeenAt: null,
    };
    markWelcomeVideoSeen.mockResolvedValue({
      completedStepIds: [],
      hidden: true,
      welcomeVideoSeenAt: '2026-08-05T12:00:00.000Z',
    });
  });

  it('marks the welcome video as seen without replacing onboarding', async () => {
    const result = renderUseWelcomeVideo();

    await act(() => result.current.markSeen());

    await waitFor(() => {
      expect(markWelcomeVideoSeen).toHaveBeenCalledWith();
    });
    expect(updateOnboarding).not.toHaveBeenCalled();
    expect(client.track.mock.calls).toEqual([
      ['welcome_video_seen', undefined],
    ]);
  });

  it('does not send welcome_video_seen again once the video was seen', async () => {
    onboarding.current = {
      ...onboarding.current,
      welcomeVideoSeenAt: '2026-08-05T12:00:00.000Z',
    };
    const result = renderUseWelcomeVideo();

    await act(() => result.current.markSeen());

    expect(markWelcomeVideoSeen).not.toHaveBeenCalled();
    expect(client.track).not.toHaveBeenCalled();
  });

  it('rejects markSeen when persistence fails so the dialog can stay open', async () => {
    markWelcomeVideoSeen.mockRejectedValue(new Error('offline'));
    const result = renderUseWelcomeVideo();

    await expect(result.current.markSeen()).rejects.toThrow('offline');
    expect(client.track).not.toHaveBeenCalled();
  });
});
