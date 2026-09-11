import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getKnowledgeBasesControllerFindAllQueryKey,
  getSkillsControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { KnowledgeBaseDocumentResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import {
  personalKnowledgeBaseListParams,
  workspaceKnowledgeBaseListParams,
} from '@/shared/api/knowledge-base-scopes';
import { useWorkspaceContextActions } from './useWorkspaceContextActions';
import { useInvalidateWorkspaceResources } from './useInvalidateWorkspaceResources';
import { useWorkspaceKnowledgeBaseActions } from './useWorkspaceKnowledgeBaseActions';
import { useWorkspaceKnowledgeBaseDocuments } from './useWorkspaceKnowledgeBaseDocuments';
import { useWorkspaceKnowledgeBases } from './useWorkspaceKnowledgeBases';
import { useWorkspaceSkills } from './useWorkspaceSkills';
import {
  personalSkillListParams,
  workspaceSkillListParams,
} from '@/shared/api/skill-scopes';

const { request, showError, showSuccess, invalidate } = vi.hoisted(() => ({
  request: vi.fn(),
  showError: vi.fn(),
  showSuccess: vi.fn(),
  invalidate: vi.fn(),
}));
vi.mock('@/shared/api/client', () => ({ customAxiosInstance: request }));
vi.mock('@/shared/lib/toast', () => ({
  showError,
  showSuccess,
  showInfo: vi.fn(),
}));
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
  it('creates workspace knowledge bases through the canonical owner-scoped endpoint', async () => {
    request.mockResolvedValue({ id: 'knowledge' });
    const { wrapper } = setup();
    const { result } = renderHook(
      () => useWorkspaceKnowledgeBaseActions('project'),
      { wrapper },
    );

    await act(() =>
      result.current.createKnowledgeBase({
        name: 'Regulations',
        description: 'Building regulations',
      }),
    );

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/knowledge-bases',
        method: 'POST',
        data: {
          ownerType: 'workspace',
          workspaceId: 'project',
          name: 'Regulations',
          description: 'Building regulations',
        },
      }),
    );
  });

  it('updates workspace knowledge bases by entity ID through the canonical endpoint', async () => {
    request.mockResolvedValue({ id: 'knowledge' });
    const { wrapper } = setup();
    const { result } = renderHook(
      () => useWorkspaceKnowledgeBaseActions('project'),
      { wrapper },
    );

    await act(() =>
      result.current.updateKnowledgeBase('knowledge', {
        name: 'Updated regulations',
        description: 'Updated reference',
      }),
    );

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/knowledge-bases/knowledge',
        method: 'PATCH',
        data: {
          name: 'Updated regulations',
          description: 'Updated reference',
        },
      }),
    );
  });

  it('sets workspace knowledge-base activation by entity ID', async () => {
    request.mockResolvedValue({ id: 'knowledge' });
    const { wrapper } = setup();
    const { result } = renderHook(
      () => useWorkspaceKnowledgeBaseActions('project'),
      { wrapper },
    );

    act(() =>
      result.current.setKnowledgeBaseActive({
        knowledgeBaseId: 'knowledge',
        isActive: false,
      }),
    );

    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/knowledge-bases/knowledge/activation',
          method: 'PATCH',
          data: { isActive: false },
        }),
      ),
    );
  });

  it('lists a paginated workspace scope through the canonical endpoint', async () => {
    request.mockResolvedValue({
      data: [{ id: 'knowledge', name: 'Regulations' }],
      pagination: { limit: 20, offset: 20, total: 42 },
    });
    const { wrapper } = setup();
    const { result } = renderHook(
      () => useWorkspaceKnowledgeBases('project', { limit: 20, offset: 20 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/knowledge-bases',
        method: 'GET',
        params: {
          ownerType: 'workspace',
          workspaceId: 'project',
          limit: 20,
          offset: 20,
        },
      }),
    );
    expect(result.current.knowledgeBases).toEqual([
      expect.objectContaining({ id: 'knowledge' }),
    ]);
    expect(result.current.pagination?.total).toBe(42);
  });

  it('lists paginated workspace skills through the canonical owner-scoped endpoint', async () => {
    request.mockResolvedValue({
      data: [{ id: 'skill', name: 'Permit review' }],
      pagination: { limit: 20, offset: 20, total: 42 },
    });
    const { wrapper } = setup();
    const { result } = renderHook(
      () => useWorkspaceSkills('project', { limit: 20, offset: 20 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/skills',
        method: 'GET',
        params: {
          ownerType: 'workspace',
          workspaceId: 'project',
          limit: 20,
          offset: 20,
        },
      }),
    );
    expect(result.current.skills).toEqual([
      expect.objectContaining({ id: 'skill' }),
    ]);
    expect(result.current.pagination?.total).toBe(42);
  });

  it('creates workspace skills through the canonical owner-scoped endpoint', async () => {
    request.mockResolvedValue({ id: 'skill' });
    const { wrapper } = setup();
    const { result } = renderHook(() => useWorkspaceContextActions('project'), {
      wrapper,
    });

    await act(() =>
      result.current.createSkill({
        name: 'Permit review',
        shortDescription: 'Reviews permits',
        instructions: 'Review the permit.',
      }),
    );

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/skills',
        method: 'POST',
        data: {
          ownerType: 'workspace',
          workspaceId: 'project',
          name: 'Permit review',
          shortDescription: 'Reviews permits',
          instructions: 'Review the permit.',
        },
      }),
    );
  });

  it('sends desired skill activation and pin states to canonical setters', async () => {
    request.mockResolvedValue({ id: 'skill' });
    const { wrapper } = setup();
    const { result } = renderHook(() => useWorkspaceContextActions('project'), {
      wrapper,
    });

    act(() => {
      result.current.setSkillActive({ skillId: 'skill', isActive: false });
      result.current.setSkillPinned({ skillId: 'skill', isPinned: true });
    });

    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/skills/skill/activation',
        method: 'PATCH',
        data: { isActive: false },
      }),
    );
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/skills/skill/pin',
        method: 'PATCH',
        data: { isPinned: true },
      }),
    );
  });

  it.each(['skill activation', 'skill pin'])(
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
        else
          result.current.setSkillPinned({ skillId: 'skill', isPinned: true });
      });
      await waitFor(() => expect(showError).toHaveBeenCalledOnce());
    },
  );

  it('confirms a saved workspace instruction', async () => {
    request.mockResolvedValue({ instruction: 'Be concise.' });
    const { wrapper } = setup();
    const { result } = renderHook(() => useWorkspaceContextActions('project'), {
      wrapper,
    });

    await act(() => result.current.updateInstruction('Be concise.'));

    expect(showSuccess).toHaveBeenCalledWith(
      'context.instructions.saveSuccess',
    );
    expect(showError).not.toHaveBeenCalled();
  });

  it('invalidates canonical workspace caches without expiring other scopes', async () => {
    const { client, wrapper } = setup();
    const skillsKey = getSkillsControllerFindAllQueryKey(
      workspaceSkillListParams('project', { limit: 20, offset: 20 }),
    );
    const otherSkillsKey = getSkillsControllerFindAllQueryKey(
      workspaceSkillListParams('other-project'),
    );
    const personalSkillsKey = getSkillsControllerFindAllQueryKey(
      personalSkillListParams,
    );
    const workspaceKey = getKnowledgeBasesControllerFindAllQueryKey(
      workspaceKnowledgeBaseListParams('project', {
        limit: 20,
        offset: 20,
      }),
    );
    const otherWorkspaceKey = getKnowledgeBasesControllerFindAllQueryKey(
      workspaceKnowledgeBaseListParams('other-project'),
    );
    const personalKey = getKnowledgeBasesControllerFindAllQueryKey(
      personalKnowledgeBaseListParams,
    );
    client.setQueryData(skillsKey, { data: [] });
    client.setQueryData(otherSkillsKey, { data: [] });
    client.setQueryData(personalSkillsKey, { data: [] });
    client.setQueryData(workspaceKey, { data: [] });
    client.setQueryData(otherWorkspaceKey, { data: [] });
    client.setQueryData(personalKey, { data: [] });
    const { result } = renderHook(
      () => useInvalidateWorkspaceResources('project'),
      { wrapper },
    );

    await act(() => result.current());

    expect(client.getQueryState(skillsKey)?.isInvalidated).toBe(true);
    expect(client.getQueryState(otherSkillsKey)?.isInvalidated).toBe(false);
    expect(client.getQueryState(personalSkillsKey)?.isInvalidated).toBe(false);
    expect(client.getQueryState(workspaceKey)?.isInvalidated).toBe(true);
    expect(client.getQueryState(otherWorkspaceKey)?.isInvalidated).toBe(false);
    expect(client.getQueryState(personalKey)?.isInvalidated).toBe(false);
    const filter = invalidate.mock.calls[0][0].filter;
    expect(filter({ params: { workspaceId: 'project' } })).toBe(true);
    expect(filter({ params: { workspaceId: 'other-project' } })).toBe(false);
  });

  it('polls canonical document responses and stops after completion', async () => {
    vi.useFakeTimers();
    const document = {
      id: 'document',
      name: 'Building regulations.pdf',
      status: 'processing',
      processingError: undefined,
    } as KnowledgeBaseDocumentResponseDto;
    request.mockResolvedValue({ data: [document] });
    const { wrapper } = setup();
    const { result } = renderHook(
      () =>
        useWorkspaceKnowledgeBaseDocuments('project', 'knowledge', {
          data: [document],
        }),
      { wrapper },
    );

    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(result.current.documents[0].status).toBe('processing');
    request.mockResolvedValue({ data: [{ ...document, status: 'ready' }] });
    await act(() => vi.advanceTimersByTimeAsync(5100));
    expect(result.current.documents[0].status).toBe('ready');
    const calls = request.mock.calls.length;
    await act(() => vi.advanceTimersByTimeAsync(15000));
    expect(request).toHaveBeenCalledTimes(calls);
  });

  it('uses canonical entity-id document operations and enables URL sources', async () => {
    const document = {
      id: 'document',
      name: 'Building regulations.pdf',
      status: 'ready',
      processingError: undefined,
    } as KnowledgeBaseDocumentResponseDto;
    request.mockResolvedValue({ data: [document] });
    const { wrapper } = setup();
    const { result } = renderHook(
      () =>
        useWorkspaceKnowledgeBaseDocuments('project', 'knowledge', {
          data: [document],
        }),
      { wrapper },
    );

    await act(() => result.current.addUrlAsync?.('https://example.com', 1));

    expect(result.current.documents).toEqual([document]);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/knowledge-bases/knowledge/urls',
        method: 'POST',
        data: { url: 'https://example.com', maxDepth: 1 },
      }),
    );
  });
});
