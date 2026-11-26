import { QueryClient } from '@tanstack/react-query';
import { isRedirect } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  featureToggles: vi.fn(),
  findNotifications: vi.fn(),
}));

vi.mock('@/pages/inbox', () => ({
  InboxPage: () => null,
  InboxNoSelection: () => null,
  notificationsPageParams: (page: number, type?: string) => ({ page, type }),
}));
vi.mock('@ayunis/api-client/endpoints', () => ({
  appControllerFeatureToggles: mocks.featureToggles,
  getAppControllerFeatureTogglesQueryKey: () => ['feature-toggles'],
  notificationsControllerFindAll: mocks.findNotifications,
  getNotificationsControllerFindAllQueryKey: (params: unknown) => [
    'notifications',
    params,
  ],
}));

const { Route } = await import('./inbox');

// The toggle checks guard the opened notification too, so they run in
// beforeLoad, before any child route loads.
async function runRoute(type?: string): Promise<unknown> {
  const queryClient = new QueryClient();
  const beforeLoad = Route.options.beforeLoad as (args: {
    search: { type?: string };
    context: { queryClient: QueryClient };
  }) => Promise<unknown>;
  const loader = Route.options.loader as (args: {
    deps: { page?: number; type?: string };
    context: { queryClient: QueryClient };
  }) => Promise<unknown>;
  await beforeLoad({ search: { type }, context: { queryClient } });
  return loader({ deps: { type }, context: { queryClient } });
}

async function redirectOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    if (isRedirect(error)) return error.options;
    throw error;
  }
  throw new Error('the loader did not redirect');
}

describe('inbox route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findNotifications.mockResolvedValue({ data: [], total: 0 });
  });

  it('filters by a notification type', async () => {
    mocks.featureToggles.mockResolvedValue({
      routinesEnabled: true,
      releaseNotesEnabled: false,
    });

    await expect(runRoute('routine_error')).resolves.toEqual({
      page: 1,
      type: 'routine_error',
      showRead: false,
    });
  });

  it('sends users to the chat with routines off', async () => {
    mocks.featureToggles.mockResolvedValue({
      routinesEnabled: false,
      releaseNotesEnabled: false,
    });

    await expect(redirectOf(runRoute())).resolves.toMatchObject({
      to: '/chat',
    });
  });
});
