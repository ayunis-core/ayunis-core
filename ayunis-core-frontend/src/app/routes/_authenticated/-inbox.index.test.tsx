import { QueryClient } from '@tanstack/react-query';
import { isRedirect } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  featureToggles: vi.fn(),
  findNotifications: vi.fn(),
}));

vi.mock('@/pages/inbox', () => ({
  InboxPage: () => null,
  notificationsPageParams: (page: number, type?: string) => ({ page, type }),
}));
vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  appControllerFeatureToggles: mocks.featureToggles,
  getAppControllerFeatureTogglesQueryKey: () => ['feature-toggles'],
  notificationsControllerFindAll: mocks.findNotifications,
  getNotificationsControllerFindAllQueryKey: (params: unknown) => [
    'notifications',
    params,
  ],
}));

const { Route } = await import('./inbox.index');

async function runLoader(type?: string): Promise<unknown> {
  const loader = Route.options.loader as (args: {
    deps: { page?: number; type?: string };
    context: { queryClient: QueryClient };
  }) => Promise<unknown>;
  return loader({
    deps: { type },
    context: { queryClient: new QueryClient() },
  });
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

  it('filters by release notes while release notes arrive', async () => {
    mocks.featureToggles.mockResolvedValue({
      routinesEnabled: true,
      releaseNotesEnabled: true,
    });

    await expect(runLoader('release_note')).resolves.toEqual({
      page: 1,
      type: 'release_note',
    });
  });

  it('offers no release-note filter without release notes', async () => {
    mocks.featureToggles.mockResolvedValue({
      routinesEnabled: true,
      releaseNotesEnabled: false,
    });

    await expect(redirectOf(runLoader('release_note'))).resolves.toMatchObject({
      to: '/inbox',
    });
  });

  it('keeps the routine filters without release notes', async () => {
    mocks.featureToggles.mockResolvedValue({
      routinesEnabled: true,
      releaseNotesEnabled: false,
    });

    await expect(runLoader('routine_error')).resolves.toEqual({
      page: 1,
      type: 'routine_error',
    });
  });

  it('sends users to the chat with routines off', async () => {
    mocks.featureToggles.mockResolvedValue({
      routinesEnabled: false,
      releaseNotesEnabled: false,
    });

    await expect(redirectOf(runLoader())).resolves.toMatchObject({
      to: '/chat',
    });
  });
});
