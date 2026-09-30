import { Suspense, type ReactNode } from 'react';
import { renderHook, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAnonymousModeDefault } from './useAnonymousModeDefault';

const { fetchDefaults } = vi.hoisted(() => ({ fetchDefaults: vi.fn() }));
vi.mock('@/shared/api', () => ({
  getOrgChatSettingsControllerGetChatStartDefaultsQueryKey: () => [
    'chat-start-defaults',
  ],
  orgChatSettingsControllerGetChatStartDefaults: fetchDefaults,
}));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <Suspense fallback={null}>{children}</Suspense>
    </QueryClientProvider>
  );
  return { client, wrapper };
}

describe('anonymous mode organization default', () => {
  it('waits for the server default instead of initializing a chat from false', async () => {
    let resolve = (_value: { anonymousModeByDefault: boolean }): void =>
      undefined;
    fetchDefaults.mockReturnValue(
      new Promise((res) => {
        resolve = res;
      }),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => useAnonymousModeDefault(), { wrapper });
    expect(result.current).toBeNull();
    resolve({ anonymousModeByDefault: true });
    await waitFor(() =>
      expect(result.current).toEqual({ isAnonymousByDefault: true }),
    );
  });
  it('reads an explicit false from the organization and ignores the prototype browser setting', async () => {
    window.localStorage.setItem('ayunis:anonymous-mode-default', 'true');
    fetchDefaults.mockResolvedValue({ anonymousModeByDefault: false });
    const { wrapper } = setup();
    const { result } = renderHook(() => useAnonymousModeDefault(), { wrapper });
    await waitFor(() =>
      expect(result.current).toEqual({ isAnonymousByDefault: false }),
    );
    window.localStorage.removeItem('ayunis:anonymous-mode-default');
  });
});
