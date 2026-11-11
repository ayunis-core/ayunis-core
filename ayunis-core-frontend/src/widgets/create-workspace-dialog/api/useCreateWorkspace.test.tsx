import type { ReactNode } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceFormData } from '@/widgets/workspace-form-dialog';
import { useCreateWorkspace } from './useCreateWorkspace';

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
  useRouter: () => ({ invalidate: vi.fn() }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

async function createWorkspace() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const form = {
    setError: vi.fn(),
  } as unknown as UseFormReturn<WorkspaceFormData>;
  const { result } = renderHook(() => useCreateWorkspace(form), { wrapper });
  act(() =>
    result.current.createWorkspace({
      name: 'Bauamt',
      description: '',
      icon: 'building',
      color: '#000000',
    }),
  );
  await waitFor(() => expect(request).toHaveBeenCalled());
  await waitFor(() => expect(result.current.isCreating).toBe(false));
}

beforeEach(() => {
  vi.resetAllMocks();
  client.track.mockResolvedValue(undefined);
});
afterEach(cleanup);

describe('workspace_created', () => {
  it('is sent without the workspace name once the workspace was created', async () => {
    request.mockResolvedValue({ id: 'workspace-1' });

    await createWorkspace();

    expect(client.track.mock.calls).toEqual([['workspace_created', undefined]]);
  });

  it('is not sent when creating the workspace failed', async () => {
    request.mockRejectedValue(new Error('create failed'));

    await createWorkspace();

    expect(client.track).not.toHaveBeenCalled();
  });
});
