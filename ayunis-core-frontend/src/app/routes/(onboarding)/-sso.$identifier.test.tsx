import { QueryClient } from '@tanstack/react-query';
import { isRedirect } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { featureToggles } = vi.hoisted(() => ({ featureToggles: vi.fn() }));

vi.mock('@/pages/auth/sso-start', () => ({ default: () => null }));

vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  getAppControllerFeatureTogglesQueryOptions: () => ({
    queryKey: ['/feature-toggles'],
    queryFn: featureToggles,
  }),
}));

const { Route } = await import('./sso.$identifier');

async function runGuard(): Promise<string | null> {
  const beforeLoad = Route.options.beforeLoad as (args: {
    context: { queryClient: QueryClient };
  }) => Promise<void>;

  try {
    await beforeLoad({
      context: {
        queryClient: new QueryClient({
          defaultOptions: { queries: { retry: false } },
        }),
      },
    });
    return null;
  } catch (error) {
    if (isRedirect(error)) {
      return (error as unknown as { options: { to: string } }).options.to;
    }
    throw error;
  }
}

describe('direct SSO route feature gate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('redirects to password login when SSO login is disabled', async () => {
    featureToggles.mockResolvedValue({ ssoLoginEnabled: false });

    expect(await runGuard()).toBe('/login');
  });

  it('fails safely to password login when toggles are unavailable', async () => {
    featureToggles.mockRejectedValue(new Error('unavailable'));

    expect(await runGuard()).toBe('/login');
  });

  it('allows the direct SSO page when SSO login is enabled', async () => {
    featureToggles.mockResolvedValue({ ssoLoginEnabled: true });

    expect(await runGuard()).toBeNull();
  });
});
