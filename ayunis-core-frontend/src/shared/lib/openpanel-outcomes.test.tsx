import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getThreadsControllerFindOneQueryKey } from '@/shared/api/generated/ayunisCoreAPI';
import type { GetThreadResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import {
  ProductiveOutcomeProvider,
  useTrackProductiveOutcome,
} from './openpanel-outcomes';

const client = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock('@/shared/lib/openpanel', () => ({ openPanel: client }));

const anonymousWorkspaceThread = {
  id: 'thread-1',
  workspaceId: 'workspace-1',
  isAnonymous: true,
  mode: 'max',
  knowledgeBases: [{ id: 'kb-1', name: 'Satzungen' }],
  sources: [],
  mcpIntegrations: [],
} as unknown as GetThreadResponseDto;

function renderInChat(queryClient: QueryClient) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ProductiveOutcomeProvider threadId="thread-1">
        {children}
      </ProductiveOutcomeProvider>
    </QueryClientProvider>
  );
  return renderHook(() => useTrackProductiveOutcome(), { wrapper });
}

describe('productive outcome tracking', () => {
  beforeEach(() => {
    client.track.mockReset().mockResolvedValue(undefined);
  });

  it('sends an outcome in an anonymous workspace chat with a knowledge base with that context', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(
      getThreadsControllerFindOneQueryKey('thread-1'),
      anonymousWorkspaceThread,
    );
    const { result } = renderInChat(queryClient);

    result.current({ outcome_type: 'answer_copied', output_type: 'answer' });

    expect(client.track.mock.calls).toEqual([
      [
        'productive_outcome',
        {
          workspace_context: true,
          anonymous_mode: true,
          has_knowledge_base: true,
          has_source: false,
          has_integration: false,
          mode: 'max',
          outcome_type: 'answer_copied',
          output_type: 'answer',
        },
      ],
    ]);
  });

  it('omits the interaction context while the thread is not loaded', () => {
    const { result } = renderInChat(new QueryClient());

    result.current({ outcome_type: 'code_copied', output_type: 'code' });

    expect(client.track.mock.calls).toEqual([
      [
        'productive_outcome',
        { outcome_type: 'code_copied', output_type: 'code' },
      ],
    ]);
  });

  it('sends nothing for an outcome outside a chat', () => {
    const { result } = renderHook(() => useTrackProductiveOutcome());

    result.current({ outcome_type: 'answer_copied', output_type: 'answer' });

    expect(client.track).not.toHaveBeenCalled();
  });
});
