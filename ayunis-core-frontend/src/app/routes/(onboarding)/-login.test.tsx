import { QueryClient } from '@tanstack/react-query';
import { isRedirect } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { me } = vi.hoisted(() => ({ me: vi.fn() }));

vi.mock('@/pages/auth/login', () => ({ default: () => null }));

vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  authenticationControllerMe: me,
  getAuthenticationControllerMeQueryKey: () => ['/auth/me'],
}));

const { Route } = await import('./login');

type LoginSearch = { redirect?: string; emailVerified?: boolean };

// Mirrors the app's own client (main.tsx), whose 5-minute staleTime is what
// makes a cached session dangerous here.
function appQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 5 * 60 * 1000 } },
  });
}

async function runGuard(
  search: LoginSearch,
  queryClient: QueryClient = appQueryClient(),
): Promise<string | null> {
  const beforeLoad = Route.options.beforeLoad as (args: {
    context: { queryClient: QueryClient };
    search: LoginSearch;
  }) => Promise<void>;

  try {
    await beforeLoad({ context: { queryClient }, search });
    return null;
  } catch (error) {
    if (isRedirect(error)) {
      return (error as unknown as { options: { to: string } }).options.to;
    }
    throw error;
  }
}

describe('login route session guard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends an already authenticated user to the chat', async () => {
    me.mockResolvedValue({ id: 'user-1', orgId: 'org-1' });

    expect(await runGuard({})).toBe('/chat');
  });

  it('honours the redirect the authenticated user was bounced from', async () => {
    me.mockResolvedValue({ id: 'user-1', orgId: 'org-1' });

    expect(await runGuard({ redirect: '/settings/account' })).toBe(
      '/settings/account',
    );
  });

  // `_authenticated` bounces here with pathname+search, so OAuth callback
  // params have to survive the round trip — the router parses the query out
  // of `to` rather than treating the whole string as a pathname.
  it('preserves the query string of the bounced-from destination', async () => {
    me.mockResolvedValue({ id: 'user-1', orgId: 'org-1' });

    expect(
      await runGuard({
        redirect: '/settings/integrations/oauth/callback?state=abc&code=xyz',
      }),
    ).toBe('/settings/integrations/oauth/callback?state=abc&code=xyz');
  });

  it('ignores an off-origin redirect planted in the link', async () => {
    me.mockResolvedValue({ id: 'user-1', orgId: 'org-1' });

    expect(await runGuard({ redirect: '//evil.example/phish' })).toBe('/chat');
  });

  // A warm cache must never stand in for the cookie: if it did, a user whose
  // session died would be redirected into an app that 401s on every request,
  // unable to get back to this form until the cache went stale.
  it('revalidates rather than trusting a cached session', async () => {
    const queryClient = appQueryClient();
    queryClient.setQueryData(['/auth/me'], { id: 'user-1', orgId: 'org-1' });
    me.mockRejectedValue(new Error('Unauthorized'));

    expect(await runGuard({}, queryClient)).toBeNull();
    expect(me).toHaveBeenCalledOnce();
  });

  it('renders the form when there is no session', async () => {
    me.mockRejectedValue(new Error('Unauthorized'));

    expect(await runGuard({})).toBeNull();
  });
});
