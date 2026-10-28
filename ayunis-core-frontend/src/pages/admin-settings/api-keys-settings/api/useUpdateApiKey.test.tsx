import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { UseFormReturn } from 'react-hook-form';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { getApiKeyUsageControllerGetApiKeyUsageQueryKey } from '@/shared/api/generated/ayunisCoreAPI';
import type { EditApiKeyFormValues } from '@/pages/admin-settings/api-keys-settings/model/editApiKeyFormSchema';
import { useUpdateApiKey } from './useUpdateApiKey';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@/shared/api/client', () => ({ customAxiosInstance: request }));
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate: vi.fn() }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/shared/lib/toast', () => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
}));

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  request.mockResolvedValue({ id: 'key-1', name: 'Renamed' });
});

afterEach(() => {
  cleanup();
  client.clear();
});

it('invalidates cached API key usage so renamed keys show their new name', async () => {
  const usageKey = getApiKeyUsageControllerGetApiKeyUsageQueryKey({
    startDate: '2026-10-01',
  });
  client.setQueryData(usageKey, [{ apiKeyId: 'key-1', name: 'Old name' }]);

  const form = {} as UseFormReturn<EditApiKeyFormValues>;
  const { result } = renderHook(() => useUpdateApiKey(form), { wrapper });
  act(() =>
    result.current.updateApiKey('key-1', { name: 'Renamed', description: '' }),
  );

  await waitFor(() =>
    expect(client.getQueryState(usageKey)?.isInvalidated).toBe(true),
  );
});
