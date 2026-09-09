import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useKnowledgeBaseAttachment } from './useKnowledgeBaseAttachment';

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  addOptions: undefined as
    { mutation?: { onSuccess?: () => void } } | undefined,
  removeOptions: undefined as
    { mutation?: { onSuccess?: () => void } } | undefined,
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));

vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  getThreadsControllerFindOneQueryKey: (id: string) => ['thread', id],
  getThreadAiContextControllerGetAiContextQueryKey: (id: string) => [
    'ai-context',
    id,
  ],
  useThreadKnowledgeBasesControllerAddKnowledgeBase: (
    options: typeof mocks.addOptions,
  ) => {
    mocks.addOptions = options;
    return { mutate: vi.fn(), mutateAsync: vi.fn() };
  },
  useThreadKnowledgeBasesControllerRemoveKnowledgeBase: (
    options: typeof mocks.removeOptions,
  ) => {
    mocks.removeOptions = options;
    return { mutate: vi.fn() };
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/shared/lib/toast', () => ({ showError: vi.fn() }));

describe('useKnowledgeBaseAttachment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.addOptions = undefined;
    mocks.removeOptions = undefined;
  });

  it('invalidates the thread and live AI context after attachment changes', () => {
    renderHook(() => useKnowledgeBaseAttachment({ threadId: 'thread-id' }));

    act(() => mocks.addOptions?.mutation?.onSuccess?.());
    act(() => mocks.removeOptions?.mutation?.onSuccess?.());

    expect(mocks.invalidateQueries).toHaveBeenCalledTimes(4);
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['thread', 'thread-id'],
    });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['ai-context', 'thread-id'],
    });
  });
});
