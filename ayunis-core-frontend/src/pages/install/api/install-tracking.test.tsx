import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInstallFromMarketplace } from './useInstallFromMarketplace';
import { useInstallIntegrationFromMarketplace } from './useInstallIntegrationFromMarketplace';

const { request, client } = vi.hoisted(() => ({
  request: vi.fn(),
  client: { track: vi.fn() },
}));

vi.mock('@/shared/api/client', () => ({ customAxiosInstance: request }));
vi.mock('@/shared/lib/openpanel', () => ({ openPanel: client }));
vi.mock('@/shared/lib/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ navigate: vi.fn() }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

async function installSkill(identifier: string) {
  const { result } = renderHook(() => useInstallFromMarketplace(), {
    wrapper,
  });
  await act(() =>
    result.current.mutateAsync({ data: { identifier } }).catch(() => undefined),
  );
}

async function installIntegration(identifier: string) {
  const { result } = renderHook(() => useInstallIntegrationFromMarketplace(), {
    wrapper,
  });
  await act(() =>
    result.current
      .mutateAsync({ data: { identifier, orgConfigValues: {} } })
      .catch(() => undefined),
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  client.track.mockResolvedValue(undefined);
});
afterEach(cleanup);

describe('install page tracking', () => {
  it('sends skill_installed with the marketplace slug once the skill was installed', async () => {
    request.mockResolvedValue({ id: 'skill-1' });

    await installSkill('protokoll-assistent');

    expect(client.track.mock.calls).toEqual([
      ['skill_installed', { marketplace_slug: 'protokoll-assistent' }],
    ]);
  });

  it('sends integration_installed and integration_connected when the install connected the integration', async () => {
    request.mockResolvedValue({
      id: 'integration-1',
      marketplaceIdentifier: 'oparl',
      connectionStatus: 'connected',
    });

    await installIntegration('oparl');

    expect(client.track.mock.calls).toEqual([
      ['integration_installed', { marketplace_slug: 'oparl' }],
      ['integration_connected', { marketplace_slug: 'oparl' }],
    ]);
  });

  it('sends only integration_installed when the connection could not be established', async () => {
    request.mockResolvedValue({
      id: 'integration-1',
      marketplaceIdentifier: 'oparl',
      connectionStatus: 'error',
    });

    await installIntegration('oparl');

    expect(client.track.mock.calls).toEqual([
      ['integration_installed', { marketplace_slug: 'oparl' }],
    ]);
  });

  it('sends nothing when an install failed', async () => {
    request.mockRejectedValue(new Error('install failed'));

    await installSkill('protokoll-assistent');
    await installIntegration('oparl');

    expect(client.track).not.toHaveBeenCalled();
  });
});
