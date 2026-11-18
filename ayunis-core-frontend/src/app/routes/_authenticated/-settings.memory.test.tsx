import { QueryClient } from '@tanstack/react-query';
import { isRedirect } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  featureToggles: vi.fn(),
}));

vi.mock('@/pages/settings/memory-settings', () => ({
  MemorySettingsPage: () => null,
}));
vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  appControllerFeatureToggles: mocks.featureToggles,
  getAppControllerFeatureTogglesQueryKey: () => ['feature-toggles'],
}));

const { Route } = await import('./settings.memory');

async function runBeforeLoad(): Promise<unknown> {
  const beforeLoad = Route.options.beforeLoad as (args: {
    context: { queryClient: QueryClient };
  }) => Promise<unknown>;
  try {
    await beforeLoad({ context: { queryClient: new QueryClient() } });
  } catch (error) {
    if (isRedirect(error)) return error.options;
    throw error;
  }
  return undefined;
}

describe('memory settings route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens while memory is enabled', async () => {
    mocks.featureToggles.mockResolvedValue({ memoryEnabled: true });

    await expect(runBeforeLoad()).resolves.toBeUndefined();
  });

  it('redirects to the general settings while memory is disabled', async () => {
    mocks.featureToggles.mockResolvedValue({ memoryEnabled: false });

    await expect(runBeforeLoad()).resolves.toMatchObject({
      to: '/settings/general',
    });
  });
});
