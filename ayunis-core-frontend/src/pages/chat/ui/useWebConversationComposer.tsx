import { useCallback, type RefObject } from 'react';
import type {
  ChatConversationAdapters,
  ChatConversationComposerConfig,
  ChatConversationHandle,
} from '@ayunis/chat/surface';
import type { SendMessageInput } from '@ayunis/chat/runs';
import { useWebIntegrations, useWebKnowledgeBases } from '@/widgets/chat-input';
import type { Thread } from '@/pages/chat/model/openapi';
import type { useThreadSubmissionState } from '@/pages/chat/hooks/useThreadSubmissionState';
import { usePendingMessage } from '@/pages/chat/hooks/usePendingMessage';
import {
  cancelDeferredThreadRun,
  deferThreadRun,
  useIsThreadRunDeferred,
} from '@/features/thread-run';

interface WebConversationComposerOptions {
  readonly thread: Thread;
  readonly conversationRef: RefObject<ChatConversationHandle | null>;
  readonly submission: ReturnType<typeof useThreadSubmissionState>;
  readonly hasProcessingSources: boolean;
  readonly addKnowledgeBase: (id: string) => void;
  readonly removeKnowledgeBase: (id: string) => void;
  readonly addIntegration: (id: string) => void;
  readonly removeIntegration: (id: string) => void;
}

export function useWebConversationComposer(
  options: WebConversationComposerOptions,
) {
  useResumePendingMessage(options);
  const deferred = useDeferredSendAdapters(options);
  const isDeferred = useIsThreadRunDeferred(options.thread.id);
  const knowledgeBases = useWebKnowledgeBases({
    attached: options.thread.knowledgeBases,
    attach: (knowledgeBase) => options.addKnowledgeBase(knowledgeBase.id),
    detach: options.removeKnowledgeBase,
  });
  const integrations = useWebIntegrations({
    attached: options.thread.mcpIntegrations,
    attach: (integration) => options.addIntegration(integration.id),
    detach: options.removeIntegration,
  });
  return {
    knowledgeBases,
    integrations,
    composer: {
      clearOnSend: true,
      deferredSendCancellable: isDeferred,
    } satisfies ChatConversationComposerConfig,
    adapters: {
      ...deferred,
      onRunStopped: options.submission.resetSubmission,
    } satisfies ChatConversationAdapters,
  };
}

function useResumePendingMessage({
  thread,
  conversationRef,
  hasProcessingSources,
}: Pick<
  WebConversationComposerOptions,
  'thread' | 'conversationRef' | 'hasProcessingSources'
>) {
  const resumeStartedRun = useCallback(
    () => conversationRef.current?.resumeStartedRun() ?? false,
    [conversationRef],
  );
  usePendingMessage({
    threadId: thread.id,
    hasProcessingSources,
    resumeStartedRun,
  });
}

function useDeferredSendAdapters(options: WebConversationComposerOptions) {
  const deferSend = useDeferSend(options);
  const { submission } = options;
  const cancelDeferredSend = useCallback(
    (threadId: string) => {
      if (!cancelDeferredThreadRun(threadId)) return false;
      submission.failSubmission(threadId);
      return true;
    },
    [submission],
  );
  return { deferSend, cancelDeferredSend };
}

function useDeferSend({
  thread,
  submission,
  hasProcessingSources,
}: Pick<
  WebConversationComposerOptions,
  'thread' | 'submission' | 'hasProcessingSources'
>) {
  return useCallback(
    (threadId: string, input: SendMessageInput) => {
      submission.startSubmission(threadId, {
        text: input.text,
        images: input.images?.map(({ file }) => file),
      });
      if (!hasProcessingSources) return false;
      deferThreadRun({
        threadId,
        text: input.text,
        images: input.images ?? [],
        skillId: input.skillId,
        voiceInput: input.voiceInput,
        messageCountBeforeSend: thread.messages.length,
      });
      return true;
    },
    [hasProcessingSources, submission, thread.messages.length],
  );
}
