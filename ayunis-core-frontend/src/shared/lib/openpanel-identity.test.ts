import { OpenPanel } from '@openpanel/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MeResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import {
  clearOpenPanelIdentity,
  identifyOpenPanelUser,
  setOpenPanelOnboardingStage,
} from './openpanel-identity';
import { trackOpenPanelEvent } from './openpanel-events';

const client = vi.hoisted(() => ({
  current: null as OpenPanel | null,
}));

vi.mock('./openpanel', () => ({
  get openPanel() {
    return client.current;
  },
}));

type SentRequest = {
  type: string;
  payload: {
    name?: string;
    profileId?: string;
    groups?: string[];
    groupIds?: string[];
    properties?: Record<string, unknown>;
  };
};

const userA: MeResponseDto = {
  id: 'user-a-uuid',
  orgId: 'org-a-uuid',
  email: 'anna@gemeinde-a.de',
  name: 'Anna Amsel',
  role: 'admin',
  systemRole: 'super_admin',
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

function createClient(options: { disabled: boolean }) {
  return new OpenPanel({
    apiUrl: 'https://analytics.test',
    clientId: 'client',
    disabled: options.disabled,
    trackScreenViews: false,
    trackOutgoingLinks: false,
    trackAttributes: false,
  });
}

async function sentRequests(): Promise<SentRequest[]> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  return fetchMock.mock.calls.map(
    ([, init]) => JSON.parse(init.body as string) as SentRequest,
  );
}

function tracked(requests: SentRequest[]) {
  return requests
    .filter((request) => request.type === 'track')
    .map(({ payload }) => ({
      name: payload.name,
      profileId: payload.profileId,
      groups: payload.groups,
      role: payload.properties?.role,
      system_role: payload.properties?.system_role,
      onboarding_stage: payload.properties?.onboarding_stage,
    }));
}

describe('OpenPanel identity', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    client.current = createClient({ disabled: false });
  });

  afterEach(() => {
    clearOpenPanelIdentity();
    client.current = null;
    fetchMock.mockClear();
    vi.unstubAllGlobals();
  });

  it('attributes the next user to their own profile and org after a logout on the same browser', async () => {
    identifyOpenPanelUser(userA);
    trackOpenPanelEvent('workspace_created');
    clearOpenPanelIdentity();
    client.current?.screenView('/login');
    identifyOpenPanelUser(userB);
    client.current?.screenView('/chat');
    trackOpenPanelEvent('workspace_created');

    const requests = await sentRequests();
    expect(tracked(requests)).toEqual([
      {
        name: 'workspace_created',
        profileId: userA.id,
        groups: [userA.orgId],
        role: 'admin',
        system_role: 'super_admin',
        onboarding_stage: undefined,
      },
      {
        name: 'screen_view',
        profileId: undefined,
        groups: undefined,
        role: undefined,
        system_role: undefined,
        onboarding_stage: undefined,
      },
      {
        name: 'screen_view',
        profileId: userB.id,
        groups: [userB.orgId],
        role: 'user',
        system_role: 'customer',
        onboarding_stage: undefined,
      },
      {
        name: 'workspace_created',
        profileId: userB.id,
        groups: [userB.orgId],
        role: 'user',
        system_role: 'customer',
        onboarding_stage: undefined,
      },
    ]);
    const afterLogout = JSON.stringify(requests.slice(3));
    expect(afterLogout).not.toContain(userA.id);
    expect(afterLogout).not.toContain(userA.orgId);
  });

  it('sends the user UUID as the profile and the org UUID as the group and its name', async () => {
    identifyOpenPanelUser(userA);

    const requests = await sentRequests();
    expect(requests).toEqual([
      {
        type: 'group',
        payload: { id: userA.orgId, type: 'organization', name: userA.orgId },
      },
      {
        type: 'assign_group',
        payload: { groupIds: [userA.orgId], profileId: userA.id },
      },
    ]);
    const everything = JSON.stringify(requests);
    expect(everything).not.toContain(userA.email);
    expect(everything).not.toContain(userA.name);
  });

  it('starts a fresh profile when a different user resolves without a logout', async () => {
    identifyOpenPanelUser(userA);
    identifyOpenPanelUser(userB);
    trackOpenPanelEvent('workspace_created');

    expect(tracked(await sentRequests())).toEqual([
      expect.objectContaining({
        profileId: userB.id,
        groups: [userB.orgId],
        role: 'user',
        system_role: 'customer',
      }),
    ]);
  });

  it('never applies an onboarding stage derived for a user other than the identified one', async () => {
    identifyOpenPanelUser(userA);
    setOpenPanelOnboardingStage(userB.id, 'completed');
    trackOpenPanelEvent('workspace_created');
    setOpenPanelOnboardingStage(userA.id, 'started');
    trackOpenPanelEvent('workspace_created');

    expect(
      tracked(await sentRequests()).map((event) => event.onboarding_stage),
    ).toEqual([undefined, 'started']);
  });

  it('sends the profile and group once per identity across navigations', async () => {
    identifyOpenPanelUser(userA);
    identifyOpenPanelUser(userA);
    identifyOpenPanelUser(userA);

    const requests = await sentRequests();
    expect(requests.map((request) => request.type)).toEqual([
      'group',
      'assign_group',
    ]);
  });

  it('sends nothing from a disabled client outside production', async () => {
    client.current = createClient({ disabled: true });

    identifyOpenPanelUser(userA);
    trackOpenPanelEvent('workspace_created');
    clearOpenPanelIdentity();

    expect(await sentRequests()).toEqual([]);
  });

  it('does nothing without a configured client', async () => {
    client.current = null;

    expect(() => {
      identifyOpenPanelUser(userA);
      clearOpenPanelIdentity();
    }).not.toThrow();
    expect(await sentRequests()).toEqual([]);
  });

  it('does not surface a throwing SDK call to login or logout', () => {
    const throwing = createClient({ disabled: false });
    throwing.clear = () => {
      throw new Error('sdk bug');
    };
    throwing.identify = () => {
      throw new Error('sdk bug');
    };
    client.current = throwing;

    expect(() => identifyOpenPanelUser(userA)).not.toThrow();
    expect(() => clearOpenPanelIdentity()).not.toThrow();
  });
});
