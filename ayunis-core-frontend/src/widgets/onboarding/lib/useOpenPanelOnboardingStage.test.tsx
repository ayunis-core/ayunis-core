import type { ReactNode } from 'react';
import { OpenPanel } from '@openpanel/web';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getAuthenticationControllerMeQueryKey,
  getOnboardingControllerGetOnboardingQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type {
  MeResponseDto,
  OnboardingResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { trackOpenPanelEvent } from '@/shared/lib/openpanel-events';
import {
  clearOpenPanelIdentity,
  identifyOpenPanelUser,
} from '@/shared/lib/openpanel-identity';
import { ONBOARDING_CATEGORIES } from '@/widgets/onboarding/config/categories';
import {
  onboardingStage,
  useOpenPanelOnboardingStage,
} from './useOpenPanelOnboardingStage';

const client = vi.hoisted(() => ({ current: null as OpenPanel | null }));

vi.mock('@/shared/lib/openpanel', () => ({
  get openPanel() {
    return client.current;
  },
}));

const fetchMock = vi.fn(
  async (_url: string, _init: RequestInit) =>
    new Response(JSON.stringify({ deviceId: 'device', sessionId: 'session' })),
);

const userStepIds = ONBOARDING_CATEGORIES.filter(
  (category) => !('adminOnly' in category),
).flatMap((category) => category.steps.map((step) => step.id));

function me(role: MeResponseDto['role']): MeResponseDto {
  return {
    id: 'user-uuid',
    orgId: 'org-uuid',
    email: 'anna@gemeinde-a.de',
    name: 'Anna Amsel',
    role,
    systemRole: 'customer',
  };
}

function onboarding(
  completedStepIds: string[],
  hidden = false,
): OnboardingResponseDto {
  return { completedStepIds, hidden, welcomeVideoSeenAt: null };
}

function renderStage(
  user: MeResponseDto,
  state: OnboardingResponseDto,
  options: { onboardingFetchedBeforeUser?: boolean } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });
  identifyOpenPanelUser(user);
  queryClient.setQueryData(getAuthenticationControllerMeQueryKey(), user);
  queryClient.setQueryData(
    getOnboardingControllerGetOnboardingQueryKey(),
    state,
    options.onboardingFetchedBeforeUser
      ? { updatedAt: Date.now() - 60_000 }
      : undefined,
  );
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  renderHook(() => useOpenPanelOnboardingStage(), { wrapper });
  return {
    refetchedOnboarding: (next: OnboardingResponseDto) =>
      act(async () => {
        queryClient.setQueryData(
          getOnboardingControllerGetOnboardingQueryKey(),
          next,
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
      }),
  };
}

async function stageOnNextEvent(): Promise<unknown> {
  fetchMock.mockClear();
  trackOpenPanelEvent('workspace_created');
  await new Promise((resolve) => setTimeout(resolve, 0));
  const requests = fetchMock.mock.calls.map(
    ([, init]) =>
      JSON.parse(init.body as string) as {
        type: string;
        payload: { properties?: Record<string, unknown> };
      },
  );
  return requests.find((request) => request.type === 'track')?.payload
    .properties?.onboarding_stage;
}

describe(onboardingStage.name, () => {
  it.each([
    [{ hidden: false, completedCount: 0, totalSteps: 30 }, 'not_started'],
    [{ hidden: false, completedCount: 1, totalSteps: 30 }, 'started'],
    [{ hidden: false, completedCount: 30, totalSteps: 30 }, 'completed'],
    [{ hidden: true, completedCount: 30, totalSteps: 30 }, 'dismissed'],
    [{ hidden: true, completedCount: 0, totalSteps: 30 }, 'dismissed'],
  ] as const)('reports %o as %s', (progress, stage) => {
    expect(onboardingStage(progress)).toBe(stage);
  });
});

describe(useOpenPanelOnboardingStage.name, () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    client.current = new OpenPanel({
      apiUrl: 'https://analytics.test',
      clientId: 'client',
      trackScreenViews: false,
      trackOutgoingLinks: false,
      trackAttributes: false,
    });
  });

  afterEach(() => {
    clearOpenPanelIdentity();
    client.current = null;
    fetchMock.mockClear();
    vi.unstubAllGlobals();
  });

  it('reports the checklist as completed on the next event once the last step visible to the role is checked', async () => {
    const { refetchedOnboarding } = renderStage(
      me('user'),
      onboarding(userStepIds.slice(1)),
    );
    expect(await stageOnNextEvent()).toBe('started');

    await refetchedOnboarding(onboarding(userStepIds));

    expect(await stageOnNextEvent()).toBe('completed');
  });

  it('keeps an admin started until the admin-only steps are checked too', async () => {
    renderStage(me('admin'), onboarding(userStepIds));

    expect(await stageOnNextEvent()).toBe('started');
  });

  // The onboarding cache isn't keyed by user: after another user signed in,
  // a checklist fetched before /auth/me resolved may be the previous user's.
  it('withholds the stage of a checklist fetched before the current user resolved', async () => {
    const { refetchedOnboarding } = renderStage(
      me('user'),
      onboarding(userStepIds),
      { onboardingFetchedBeforeUser: true },
    );
    expect(await stageOnNextEvent()).toBeUndefined();

    await refetchedOnboarding(onboarding(userStepIds));

    expect(await stageOnNextEvent()).toBe('completed');
  });

  it('reports a hidden checklist as dismissed on the next event', async () => {
    const { refetchedOnboarding } = renderStage(me('user'), onboarding([]));
    expect(await stageOnNextEvent()).toBe('not_started');

    await refetchedOnboarding(onboarding([], true));

    expect(await stageOnNextEvent()).toBe('dismissed');
  });
});
