import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWebConversationComposer } from './useWebConversationComposer';

const runState = vi.hoisted(() => ({
  cancelDeferredThreadRun: vi.fn(),
  deferThreadRun: vi.fn(),
  deferred: false,
  capabilities: { voice: false },
}));

vi.mock('@/widgets/chat-input', () => ({
  useWebComposerConfiguration: () => ({
    adapters: {},
    slots: {},
    capabilities: runState.capabilities,
  }),
}));

vi.mock('@/pages/chat/hooks/usePendingMessage', () => ({
  usePendingMessage: vi.fn(),
}));

vi.mock('@/features/thread-run', () => ({
  cancelDeferredThreadRun: runState.cancelDeferredThreadRun,
  deferThreadRun: runState.deferThreadRun,
  useIsThreadRunDeferred: () => runState.deferred,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

type Options = Parameters<typeof useWebConversationComposer>[0];

function options(hasProcessingSources: boolean): Options {
  return {
    thread: {
      id: 'thread-id',
      messages: [],
      piiMasks: [],
      sources: [],
      knowledgeBases: [],
      mcpIntegrations: [],
      isAnonymous: false,
    } as unknown as Options['thread'],
    conversationRef: { current: null },
    submission: {
      startSubmission: vi.fn(),
      failSubmission: vi.fn(),
      resetSubmission: vi.fn(),
    } as unknown as Options['submission'],
    files: {
      files: [],
      isUploading: false,
      upload: vi.fn(),
      remove: vi.fn(),
    } as unknown as Options['files'],
    hasProcessingSources,
    isAcademyGated: false,
    isEmbeddingModelEnabled: true,
    isModelUnavailable: false,
    onNewChat: vi.fn(),
    addKnowledgeBase: vi.fn(),
    removeKnowledgeBase: vi.fn(),
    addIntegration: vi.fn(),
    removeIntegration: vi.fn(),
  };
}

describe('Web conversation composer adapters', () => {
  beforeEach(() => {
    runState.cancelDeferredThreadRun.mockReset();
    runState.deferThreadRun.mockReset();
    runState.deferred = false;
  });

  it('starts optimistic submission state but leaves an ordinary send to the package runtime', () => {
    const props = options(false);
    const { result } = renderHook(() => useWebConversationComposer(props));
    const input = { text: 'Send now', images: [] };

    expect(result.current.adapters.deferSend?.('thread-id', input)).toBe(false);
    expect(props.submission.startSubmission).toHaveBeenCalledWith('thread-id', {
      text: 'Send now',
      images: [],
    });
    expect(runState.deferThreadRun).not.toHaveBeenCalled();
    expect(result.current.capabilities).toBe(runState.capabilities);
  });

  it('queues a send only while host-owned sources are processing', () => {
    const props = options(true);
    const { result } = renderHook(() => useWebConversationComposer(props));
    const input = { text: 'Wait for files', images: [], voiceInput: true };

    expect(result.current.adapters.deferSend?.('thread-id', input)).toBe(true);
    expect(runState.deferThreadRun).toHaveBeenCalledWith({
      threadId: 'thread-id',
      text: 'Wait for files',
      images: [],
      skillId: undefined,
      voiceInput: true,
      messageCountBeforeSend: 0,
    });
  });

  it('restores a cancelled deferred send and exposes its cancellable state', () => {
    runState.deferred = true;
    runState.cancelDeferredThreadRun.mockReturnValue(true);
    const props = options(true);
    const { result } = renderHook(() => useWebConversationComposer(props));

    act(() => {
      expect(result.current.adapters.cancelDeferredSend?.('thread-id')).toBe(
        true,
      );
    });
    expect(props.submission.failSubmission).toHaveBeenCalledWith('thread-id');
    expect(result.current.composer.deferredSendCancellable).toBe(true);
  });
});
