import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCompleteMcpOAuth } from './useCompleteMcpOAuth';

const { request, client } = vi.hoisted(() => ({
  request: vi.fn(),
  client: { track: vi.fn() },
}));

vi.mock('@/shared/api/client', () => ({ customAxiosInstance: request }));
vi.mock('@/shared/lib/openpanel', () => ({ openPanel: client }));

function respond(completion: () => Promise<unknown>) {
  request.mockImplementation(({ url }: { url: string }) =>
    url === '/mcp-integrations/oauth/complete'
      ? completion()
      : Promise.resolve([
          { id: 'integration-1', marketplaceIdentifier: 'oparl' },
        ]),
  );
}

function completeOAuth() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(
    () => useCompleteMcpOAuth({ code: 'code', state: 'state' }),
    { wrapper },
  ).result;
}

beforeEach(() => {
  vi.resetAllMocks();
  client.track.mockResolvedValue(undefined);
});
afterEach(cleanup);

describe('integration_connected on OAuth completion', () => {
  it('is sent with the marketplace slug once OAuth completed', async () => {
    respond(() => Promise.resolve({ integrationId: 'integration-1' }));

    completeOAuth();

    await waitFor(() =>
      expect(client.track.mock.calls).toEqual([
        ['integration_connected', { marketplace_slug: 'oparl' }],
      ]),
    );
  });

  it('is not sent when completing OAuth failed', async () => {
    respond(() => Promise.reject(new Error('invalid state')));

    const result = completeOAuth();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(request).toHaveBeenCalledOnce();
    expect(client.track).not.toHaveBeenCalled();
  });
});
