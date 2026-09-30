import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

const { getInvite, isCloud } = vi.hoisted(() => ({
  getInvite: vi.fn(),
  isCloud: vi.fn().mockResolvedValue({ isCloud: true }),
}));

vi.mock('@/pages/auth/invite-accept', () => ({
  default: () => null,
  InviteErrorPage: () => null,
}));

vi.mock('@/shared/api', () => ({
  appControllerIsCloud: isCloud,
  getInvitesControllerGetInviteByTokenQueryKey: (token: string) => [
    '/api/invites',
    token,
  ],
  invitesControllerGetInviteByToken: getInvite,
}));

const { Route } = await import('./accept-invite');

describe('accept invite route loader', () => {
  it('revalidates authentication policy instead of trusting the cached invite', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { staleTime: 5 * 60 * 1000 } },
    });
    queryClient.setQueryData(['/api/invites', 'token'], {
      localPasswordLoginEnabled: true,
    });
    getInvite.mockResolvedValue({ localPasswordLoginEnabled: false });

    await expect(runLoader(queryClient)).resolves.toMatchObject({
      invite: { localPasswordLoginEnabled: false },
    });
    expect(getInvite).toHaveBeenCalledWith('token');
  });
});

async function runLoader(queryClient: QueryClient): Promise<unknown> {
  const loader = Route.options.loader as (args: {
    deps: { token: string };
    context: { queryClient: QueryClient };
  }) => Promise<unknown>;
  return loader({ deps: { token: 'token' }, context: { queryClient } });
}
