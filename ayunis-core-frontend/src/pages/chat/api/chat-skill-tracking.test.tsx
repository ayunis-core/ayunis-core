import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateSkillFromChat } from './useCreateSkillFromChat';
import { useInstallMarketplaceSkillFromChat } from './useInstallMarketplaceSkillFromChat';

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

async function installFromChat(identifier: string) {
  const { result } = renderHook(
    () =>
      useInstallMarketplaceSkillFromChat({
        threadId: 'thread-1',
        onInstalled: vi.fn(),
      }),
    { wrapper },
  );
  await act(() =>
    result.current.mutateAsync({ identifier }).catch(() => undefined),
  );
}

async function createFromChat() {
  const { result } = renderHook(
    () =>
      useCreateSkillFromChat({
        threadId: 'thread-1',
        workspaceId: null,
        onCreated: vi.fn(),
      }),
    { wrapper },
  );
  await act(() =>
    result.current
      .mutateAsync({
        name: 'Protokoll',
        shortDescription: 'Schreibt Protokolle',
        instructions: 'Schreibe ein Protokoll.',
        isActive: true,
      })
      .catch(() => undefined),
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  client.track.mockResolvedValue(undefined);
});
afterEach(cleanup);

describe('chat widget skill tracking', () => {
  it('sends skill_installed with the marketplace slug once the skill was installed', async () => {
    request.mockResolvedValue({ id: 'skill-1' });

    await installFromChat('protokoll-assistent');

    expect(client.track.mock.calls).toEqual([
      ['skill_installed', { marketplace_slug: 'protokoll-assistent' }],
    ]);
  });

  it('sends skill_created without the skill name once the skill was created', async () => {
    request.mockResolvedValue({ id: 'skill-1' });

    await createFromChat();

    expect(client.track.mock.calls).toEqual([['skill_created', undefined]]);
  });

  it('sends nothing when installing or creating failed', async () => {
    request.mockRejectedValue(new Error('request failed'));

    await installFromChat('protokoll-assistent');
    await createFromChat();

    expect(client.track).not.toHaveBeenCalled();
  });
});
