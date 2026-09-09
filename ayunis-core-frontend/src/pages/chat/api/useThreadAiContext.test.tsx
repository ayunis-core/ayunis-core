import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useThreadAiContext } from './useThreadAiContext';

const mocks = vi.hoisted(() => ({
  useAiContext: vi.fn(),
  getQueryKey: vi.fn((threadId: string) => ['ai-context', threadId]),
}));

vi.mock('@/shared/api', () => ({
  getThreadAiContextControllerGetAiContextQueryKey: mocks.getQueryKey,
  useThreadAiContextControllerGetAiContext: mocks.useAiContext,
}));

describe('useThreadAiContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAiContext.mockReturnValue({
      data: { skills: [], knowledgeBases: [] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('uses the generated thread AI-context query and respects lazy loading', () => {
    renderHook(() => useThreadAiContext('thread-id', false));

    expect(mocks.getQueryKey).toHaveBeenCalledWith('thread-id');
    expect(mocks.useAiContext).toHaveBeenCalledWith('thread-id', {
      query: {
        enabled: false,
        queryKey: ['ai-context', 'thread-id'],
        staleTime: 0,
      },
    });
  });
});
