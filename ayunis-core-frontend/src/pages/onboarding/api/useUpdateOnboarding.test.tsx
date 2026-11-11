import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getOnboardingControllerGetOnboardingQueryKey } from '@/shared/api/generated/ayunisCoreAPI';
import type { UpdateOnboardingDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useUpdateOnboarding } from './useUpdateOnboarding';

const { request, client } = vi.hoisted(() => ({
  request: vi.fn(),
  client: { track: vi.fn() },
}));

vi.mock('@/shared/api/client', () => ({ customAxiosInstance: request }));
vi.mock('@/shared/lib/openpanel', () => ({ openPanel: client }));
vi.mock('@/shared/lib/toast', () => ({ showError: vi.fn() }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const previous = {
  completedStepIds: ['sendFirstMessage'],
  hidden: false,
  welcomeVideoSeenAt: null,
};

async function saveOnboarding(next: UpdateOnboardingDto) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  queryClient.setQueryData(
    getOnboardingControllerGetOnboardingQueryKey(),
    previous,
  );
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result, unmount } = renderHook(() => useUpdateOnboarding(), {
    wrapper,
  });
  act(() => result.current.updateOnboarding(next));
  // Hiding the checklist navigates away before the save resolves.
  unmount();
  await waitFor(() => expect(request).toHaveBeenCalled());
  await waitFor(() => expect(queryClient.isMutating()).toBe(0));
}

beforeEach(() => {
  vi.resetAllMocks();
  client.track.mockResolvedValue(undefined);
  request.mockImplementation(({ data }: { data: UpdateOnboardingDto }) =>
    Promise.resolve({ ...data, welcomeVideoSeenAt: null }),
  );
});
afterEach(cleanup);

describe('onboarding tracking', () => {
  it.each([
    [['sendFirstMessage', 'uploadDocument'], 'uploadDocument', true],
    [[], 'sendFirstMessage', false],
  ])(
    'sends the toggled step once the checklist %j was saved',
    async (completedStepIds, stepId, checked) => {
      await saveOnboarding({ completedStepIds, hidden: false });

      expect(client.track.mock.calls).toEqual([
        ['onboarding_step_toggled', { step_id: stepId, checked }],
      ]);
    },
  );

  it('sends hidden: true once hiding the checklist was saved', async () => {
    await saveOnboarding({
      completedStepIds: ['sendFirstMessage'],
      hidden: true,
    });

    expect(client.track.mock.calls).toEqual([
      ['onboarding_hidden_changed', { hidden: true }],
    ]);
  });

  it('sends nothing when saving the checklist failed', async () => {
    request.mockRejectedValue(new Error('save failed'));

    await saveOnboarding({ completedStepIds: [], hidden: true });

    expect(client.track).not.toHaveBeenCalled();
  });
});
