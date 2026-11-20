import type { ReactNode } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
} from '@tanstack/react-query';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getMcpIntegrationsControllerListAvailableQueryKey } from '@/shared/api/generated/ayunisCoreAPI';
import type { McpIntegrationResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useUserIntegrations } from './useUserIntegrations';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@/shared/api/client', () => ({ customAxiosInstance: request }));

const integration: McpIntegrationResponseDto = {
  id: 'personal-integration',
  name: 'Personal MCP',
  type: 'custom',
  enabled: true,
  organizationId: 'organization',
  hasCredentials: true,
  returnsPii: false,
  createdAt: '2026-11-16T10:00:00.000Z',
  updatedAt: '2026-11-16T10:00:00.000Z',
  userAuthorized: true,
  configSchema: {
    authType: 'OAUTH',
    orgFields: [],
    userFields: [],
    oauth: { clientRegistration: 'automatic' },
  },
};
let client: QueryClient;
let failure: McpIntegrationResponseDto['userConnectionFailure'];

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.useFakeTimers();
  focusManager.setFocused(true);
  failure = undefined;
  client = new QueryClient({
    defaultOptions: { queries: { staleTime: 300_000, retry: false } },
  });
  client.setQueryData(getMcpIntegrationsControllerListAvailableQueryKey(), [
    integration,
  ]);
  request.mockImplementation(async () => [
    { ...integration, userConnectionFailure: failure },
  ]);
});

afterEach(() => {
  cleanup();
  client.clear();
  focusManager.setFocused();
  vi.useRealTimers();
});

describe('useUserIntegrations health', () => {
  it('shows a health failure persisted after an earlier healthy response without keeping the five-minute cache', async () => {
    const { result } = renderHook(() => useUserIntegrations(), { wrapper });
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(
      result.current.integrations[0]?.userConnectionFailure,
    ).toBeUndefined();
    failure = 'rejected';
    await act(() => vi.advanceTimersByTimeAsync(5_000));
    expect(result.current.integrations[0]?.userConnectionFailure).toBe(
      'rejected',
    );
  });
});
