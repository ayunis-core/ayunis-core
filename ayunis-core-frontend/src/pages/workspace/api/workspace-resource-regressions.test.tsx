import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getWorkspaceContextControllerListSkillsQueryKey } from '@/shared/api/generated/ayunisCoreAPI';
import type { WorkspaceDocumentResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useWorkspaceContextActions } from './useWorkspaceContextActions';
import { useInvalidateWorkspaceResources } from './useInvalidateWorkspaceResources';
import { useWorkspaceKnowledgeBaseDocuments } from './useWorkspaceKnowledgeBaseDocuments';

const { request, showError, invalidate } = vi.hoisted(() => ({
  request: vi.fn(),
  showError: vi.fn(),
  invalidate: vi.fn(),
}));
vi.mock('@/shared/api/client', () => ({ customAxiosInstance: request }));
vi.mock('@/shared/lib/toast', () => ({ showError }));
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function setup() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 300000 },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

beforeEach(() => {
  vi.resetAllMocks();
  invalidate.mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('workspace resource regressions', () => {
  it.each(['skill', 'knowledge-base'])(
    'surfaces failed %s creation',
    async (kind) => {
      request.mockRejectedValue(new Error('Request rejected'));
      const { wrapper } = setup();
      const { result } = renderHook(
        () => useWorkspaceContextActions('project'),
        { wrapper },
      );
      await act(async () => {
        const promise =
          kind === 'skill'
            ? result.current.createSkill({
                name: 'Permit review',
                shortDescription: 'Check permits',
                instructions: 'Check regulations.',
              })
            : result.current.createKnowledgeBase({
                name: 'Regulations',
                description: 'Building regulations',
              });
        await expect(promise).rejects.toThrow('Request rejected');
      });
      expect(showError).toHaveBeenCalledWith('create.error');
      expect(request).toHaveBeenCalledOnce();
    },
  );

  it.each(['skill activation', 'skill pin', 'knowledge activation'])(
    'surfaces failed %s changes',
    async (kind) => {
      request.mockRejectedValue(new Error('Request rejected'));
      const { wrapper } = setup();
      const { result } = renderHook(
        () => useWorkspaceContextActions('project'),
        { wrapper },
      );
      act(() => {
        if (kind === 'skill activation')
          result.current.setSkillActive({ skillId: 'skill', isActive: false });
        else if (kind === 'skill pin')
          result.current.setSkillPinned({ skillId: 'skill', isPinned: true });
        else
          result.current.setKnowledgeBaseActive({
            knowledgeBaseId: 'knowledge',
            isActive: false,
          });
      });
      await waitFor(() => expect(showError).toHaveBeenCalledOnce());
    },
  );

  it('invalidates cached list pages without expiring other projects', async () => {
    const { client, wrapper } = setup();
    const key = getWorkspaceContextControllerListSkillsQueryKey('project', {
      limit: 20,
      offset: 20,
    });
    const otherKey =
      getWorkspaceContextControllerListSkillsQueryKey('other-project');
    client.setQueryData(key, { data: [] });
    client.setQueryData(otherKey, { data: [] });
    const { result } = renderHook(
      () => useInvalidateWorkspaceResources('project'),
      { wrapper },
    );
    await act(() => result.current());
    expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    expect(client.getQueryState(otherKey)?.isInvalidated).toBe(false);
    const filter = invalidate.mock.calls[0][0].filter;
    expect(filter({ params: { workspaceId: 'project' } })).toBe(true);
    expect(filter({ params: { workspaceId: 'other-project' } })).toBe(false);
  });

  it('polls processing documents and stops after completion', async () => {
    vi.useFakeTimers();
    const document = {
      id: 'document',
      name: 'Building regulations.pdf',
      status: 'processing',
      processingError: null,
    } as WorkspaceDocumentResponseDto;
    request.mockResolvedValue([document]);
    const { wrapper } = setup();
    const { result } = renderHook(
      () =>
        useWorkspaceKnowledgeBaseDocuments('project', 'knowledge', [document]),
      { wrapper },
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(result.current.documents[0].status).toBe('processing');
    request.mockResolvedValue([{ ...document, status: 'ready' }]);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5100);
    });
    expect(result.current.documents[0].status).toBe('ready');
    const calls = request.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });
    expect(request).toHaveBeenCalledTimes(calls);
  });
});
