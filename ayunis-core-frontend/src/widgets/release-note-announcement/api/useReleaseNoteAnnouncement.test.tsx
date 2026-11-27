import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useReleaseNoteAnnouncement } from './useReleaseNoteAnnouncement';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock('@ayunis/api-client/request', () => ({ customAxiosInstance: request }));
vi.mock('@/features/feature-toggles', () => ({
  useIsFeatureEnabled: () => true,
}));
vi.mock('@/widgets/chat-starter', () => ({
  loadChatStarterDefaults: () =>
    Promise.resolve({
      selectedModelId: 'mode:auto',
      isEmbeddingModelEnabled: true,
    }),
}));

const RELEASE_NOTE = { id: 'note-1', headline: 'Ayunis Core in Outlook' };

let client: QueryClient;
let welcomeVideoSeenAt: string | null;
let onboardingFails: boolean;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const requestedUrls = () =>
  request.mock.calls.map(([config]) => (config as { url: string }).url);

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  welcomeVideoSeenAt = null;
  onboardingFails = false;
  request.mockImplementation(async ({ url }: { url: string }) => {
    if (url === '/onboarding') {
      if (onboardingFails) throw new Error('onboarding unavailable');
      return { welcomeVideoSeenAt };
    }
    if (url === '/release-notes/instant-open') {
      return { releaseNote: RELEASE_NOTE };
    }
    throw new Error(`unexpected request ${url}`);
  });
});

afterEach(() => {
  cleanup();
  client.clear();
  request.mockReset();
});

describe('useReleaseNoteAnnouncement', () => {
  it('does not look for an update to open before the welcome video is seen, so it never opens over it', async () => {
    const { result } = renderHook(() => useReleaseNoteAnnouncement(), {
      wrapper,
    });

    await waitFor(() => expect(requestedUrls()).toContain('/onboarding'));

    expect(requestedUrls()).not.toContain('/release-notes/instant-open');
    expect(result.current).toBeNull();
  });

  it('still opens the update when onboarding cannot be loaded, since the welcome video then does not show either', async () => {
    onboardingFails = true;

    const { result } = renderHook(() => useReleaseNoteAnnouncement(), {
      wrapper,
    });

    await waitFor(() =>
      expect(result.current?.releaseNote).toEqual(RELEASE_NOTE),
    );
  });

  it('returns the update to open with the composer defaults once the welcome video is seen', async () => {
    welcomeVideoSeenAt = '2026-11-05T12:00:00.000Z';

    const { result } = renderHook(() => useReleaseNoteAnnouncement(), {
      wrapper,
    });

    await waitFor(() =>
      expect(result.current).toEqual({
        releaseNote: RELEASE_NOTE,
        chatStarterDefaults: {
          selectedModelId: 'mode:auto',
          isEmbeddingModelEnabled: true,
        },
      }),
    );
  });
});
