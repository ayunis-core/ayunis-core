import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GetThreadResponseDto } from '@ayunis/api-client/schemas';
import type { ChatStarted } from '@ayunis/chat/surface';
import { useWebChatStarted } from './useWebChatStarted';

const mocks = vi.hoisted(() => ({ navigate: vi.fn(), track: vi.fn() }));
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
}));
vi.mock('@/shared/lib/openpanel', () => ({
  openPanel: { track: mocks.track },
}));

const thread = {
  id: 'thread-1',
  workspaceId: null,
  isAnonymous: false,
  mode: null,
  knowledgeBases: [],
  sources: [],
  mcpIntegrations: [],
} as unknown as GetThreadResponseDto;

function started(overrides: Partial<ChatStarted> = {}): ChatStarted {
  return {
    thread,
    skillId: 'skill-1',
    sources: [],
    knowledgeBases: [],
    integrations: [],
    settled: Promise.resolve(true),
    ...overrides,
  };
}

async function open(chat: ChatStarted) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>
      {children}
    </QueryClientProvider>
  );
  const { result } = renderHook(() => useWebChatStarted(), { wrapper });
  await act(async () => {
    result.current(chat);
    await chat.settled;
  });
}

afterEach(() => vi.clearAllMocks());

describe('useWebChatStarted', () => {
  it('sends one chat_started with the context of a workspace chat started with a knowledge base in Auto', async () => {
    mocks.track.mockResolvedValue(undefined);

    await open(
      started({
        thread: { ...thread, workspaceId: 'workspace-1', mode: 'auto' },
        skillId: undefined,
        knowledgeBases: [{ id: 'kb-1', name: 'Haushaltsplan 2026' }],
      }),
    );

    expect(mocks.track.mock.calls).toEqual([
      [
        'chat_started',
        {
          workspace_context: true,
          anonymous_mode: false,
          has_knowledge_base: true,
          has_source: false,
          has_integration: false,
          mode: 'auto',
          has_skill: false,
        },
      ],
    ]);
  });

  it('sends onboarding_chat_started with the stage after chat_started for an onboarding chat', async () => {
    mocks.track.mockResolvedValue(undefined);

    await open(
      started({ origin: { kind: 'onboarding', stage: 'first_skill' } }),
    );

    expect(mocks.track.mock.calls.map(([name]) => name)).toEqual([
      'chat_started',
      'onboarding_chat_started',
    ]);
    expect(mocks.track).toHaveBeenLastCalledWith('onboarding_chat_started', {
      stage: 'first_skill',
    });
  });

  it('neither opens nor reports a chat whose start was stopped while settling', async () => {
    await open(started({ settled: Promise.resolve(false) }));

    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(mocks.track).not.toHaveBeenCalled();
  });

  it('still opens the new chat when sending chat_started fails', async () => {
    mocks.track.mockImplementation(() => {
      throw new Error('analytics down');
    });

    await open(started());

    expect(mocks.navigate).toHaveBeenCalledWith({
      to: '/chats/$threadId',
      params: { threadId: 'thread-1' },
    });
  });
});
