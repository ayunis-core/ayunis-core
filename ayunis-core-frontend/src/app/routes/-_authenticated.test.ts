import { OpenPanel } from '@openpanel/web';
import { QueryClient } from '@tanstack/react-query';
import { isRedirect } from '@tanstack/react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MeResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { trackOpenPanelEvent } from '@/shared/lib/openpanel-events';
import { clearOpenPanelIdentity } from '@/shared/lib/openpanel-identity';

const { me, client } = vi.hoisted(() => ({
  me: vi.fn(),
  client: { current: null as OpenPanel | null },
}));

vi.mock('@/layouts/authenticated-layout', () => ({ default: () => null }));

vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  authenticationControllerMe: me,
  getAuthenticationControllerMeQueryKey: () => ['/auth/me'],
  appControllerIsCloud: () => Promise.resolve({ isCloud: true }),
  getAppControllerIsCloudQueryKey: () => ['/app/is-cloud'],
}));

vi.mock('@/shared/lib/openpanel', () => ({
  get openPanel() {
    return client.current;
  },
}));

const { Route } = await import('./_authenticated');

const userA: MeResponseDto = {
  id: 'user-a-uuid',
  orgId: 'org-a-uuid',
  email: 'anna@gemeinde-a.de',
  name: 'Anna Amsel',
  role: 'admin',
  systemRole: 'customer',
};

const userB: MeResponseDto = {
  id: 'user-b-uuid',
  orgId: 'org-b-uuid',
  email: 'bernd@stadt-b.de',
  name: 'Bernd Bussard',
  role: 'user',
  systemRole: 'customer',
};

const fetchMock = vi.fn(
  async (_url: string, _init: RequestInit) =>
    new Response(JSON.stringify({ deviceId: 'device', sessionId: 'session' })),
);

async function runBootstrap(
  queryClient: QueryClient,
  preload = false,
): Promise<void> {
  const beforeLoad = Route.options.beforeLoad as (args: {
    context: { queryClient: QueryClient };
    preload: boolean;
  }) => Promise<unknown>;
  try {
    await beforeLoad({ context: { queryClient }, preload });
  } catch (error) {
    if (!isRedirect(error)) throw error;
  }
}

async function trackedProfiles() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  return fetchMock.mock.calls
    .map(
      ([, init]) =>
        JSON.parse(init.body as string) as {
          type: string;
          payload: { name?: string; profileId?: string; groups?: string[] };
        },
    )
    .filter((request) => request.type === 'track')
    .map(({ payload }) => ({
      name: payload.name,
      profileId: payload.profileId,
      groups: payload.groups,
    }));
}

describe('authenticated bootstrap analytics identity', () => {
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
    me.mockReset();
    fetchMock.mockClear();
    vi.unstubAllGlobals();
  });

  it('stops attributing events to a user whose session ended before the next user signs in', async () => {
    me.mockResolvedValueOnce(userA)
      .mockRejectedValueOnce(new Error('Unauthorized'))
      .mockResolvedValueOnce(userB);

    await runBootstrap(new QueryClient());
    trackOpenPanelEvent('workspace_created');
    await runBootstrap(new QueryClient());
    client.current?.screenView('/login');
    await runBootstrap(new QueryClient());
    trackOpenPanelEvent('workspace_created');

    expect(await trackedProfiles()).toEqual([
      {
        name: 'workspace_created',
        profileId: userA.id,
        groups: [userA.orgId],
      },
      { name: 'screen_view', profileId: undefined, groups: undefined },
      {
        name: 'workspace_created',
        profileId: userB.id,
        groups: [userB.orgId],
      },
    ]);
  });

  it('keeps the profile when a hover preload of an authenticated route fails', async () => {
    me.mockResolvedValueOnce(userA).mockRejectedValueOnce(
      new Error('Network Error'),
    );

    await runBootstrap(new QueryClient());
    await runBootstrap(new QueryClient(), true);
    trackOpenPanelEvent('workspace_created');

    expect(await trackedProfiles()).toEqual([
      {
        name: 'workspace_created',
        profileId: userA.id,
        groups: [userA.orgId],
      },
    ]);
  });

  it('keeps login working when analytics is not configured', async () => {
    client.current = null;
    me.mockResolvedValue(userA);

    const beforeLoad = Route.options.beforeLoad as (args: {
      context: { queryClient: QueryClient };
      preload: boolean;
    }) => Promise<unknown>;

    await expect(
      beforeLoad({
        context: { queryClient: new QueryClient() },
        preload: false,
      }),
    ).resolves.toEqual({ user: userA });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
