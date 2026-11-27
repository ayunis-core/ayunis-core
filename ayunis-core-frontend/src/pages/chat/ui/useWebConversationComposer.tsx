import { useCallback, type RefObject } from 'react';
import type { PermittedLanguageModelResponseDto } from '@ayunis/api-client';
import type {
  ChatConversationAdapters,
  ChatConversationComposerConfig,
  ChatConversationHandle,
  ChatConversationSlots,
} from '@ayunis/chat/surface';
import {
  LongChatWarning,
  ProviderFaultNotice,
  getModeValue,
} from '@ayunis/chat/model-presentation';
import type { SendMessageInput } from '@ayunis/chat/runs';
import {
  useWebComposerConfiguration,
  type WebComposerConfigurationProps,
} from '@/widgets/chat-input';
import type { Thread } from '@/pages/chat/model/openapi';
import type { useChatFiles } from '@/pages/chat/api/useChatFiles';
import type { useThreadSubmissionState } from '@/pages/chat/hooks/useThreadSubmissionState';
import { usePendingMessage } from '@/pages/chat/hooks/usePendingMessage';
import {
  cancelDeferredThreadRun,
  deferThreadRun,
  useIsThreadRunDeferred,
} from '@/features/thread-run';
import { useTranslation } from 'react-i18next';
import { AcademyGateNotice } from '@/widgets/academy-gate-notice';
import { readChatDraft, writeChatDraft } from '@/shared/lib/chat-draft-storage';

interface WebConversationComposerOptions {
  readonly thread: Thread;
  readonly conversationRef: RefObject<ChatConversationHandle | null>;
  readonly submission: ReturnType<typeof useThreadSubmissionState>;
  readonly files: ReturnType<typeof useChatFiles>;
  readonly hasProcessingSources: boolean;
  readonly isAcademyGated: boolean;
  readonly isEmbeddingModelEnabled: boolean;
  readonly model?: PermittedLanguageModelResponseDto;
  readonly isModelUnavailable: boolean;
  readonly onNewChat: () => void;
  readonly addKnowledgeBase: (id: string) => void;
  readonly removeKnowledgeBase: (id: string) => void;
  readonly addIntegration: (id: string) => void;
  readonly removeIntegration: (id: string) => void;
}

const webDrafts = { read: readChatDraft, write: writeChatDraft };

export function useWebConversationComposer(
  options: WebConversationComposerOptions,
) {
  useResumePendingMessage(options);
  const configuration = useWebComposerConfiguration(
    webComposerConfiguration(options),
  );
  const deferred = useDeferredSendAdapters(options);
  const isDeferred = useIsThreadRunDeferred(options.thread.id);
  const { t } = useTranslation('chat');
  return {
    capabilities: configuration.capabilities,
    composer: composerConfig(options, isDeferred),
    adapters: {
      ...configuration.adapters,
      ...deferred,
      drafts: webDrafts,
      onRunStopped: options.submission.resetSubmission,
    } satisfies ChatConversationAdapters,
    slots: {
      ...configuration.slots,
      composerNotice: webComposerNotices(options, t),
    } satisfies ChatConversationSlots,
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

function webComposerConfiguration({
  thread,
  files,
  isAcademyGated,
  isEmbeddingModelEnabled,
  model,
  addKnowledgeBase,
  removeKnowledgeBase,
  addIntegration,
  removeIntegration,
}: WebConversationComposerOptions): WebComposerConfigurationProps {
  return {
    modelId: thread.mode
      ? getModeValue(thread.mode)
      : (model?.id ?? thread.permittedModelId),
    isModelChangeDisabled: true,
    isAnonymousChangeDisabled: true,
    sources: files.files,
    knowledgeBases: thread.knowledgeBases,
    mcpIntegrations: thread.mcpIntegrations,
    isSendDisabled: files.isUploading || isAcademyGated,
    onModelChange: () => undefined,
    onFileUpload: files.upload,
    onRemoveSource: files.remove,
    onAddKnowledgeBase: (knowledgeBase) => addKnowledgeBase(knowledgeBase.id),
    onRemoveKnowledgeBase: removeKnowledgeBase,
    onAddIntegration: (integration) => addIntegration(integration.id),
    onRemoveIntegration: removeIntegration,
    isEmbeddingModelEnabled,
    isAnonymous: thread.isAnonymous,
    isVisionEnabled: model?.canVision ?? false,
  };
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

function composerConfig(
  options: WebConversationComposerOptions,
  isDeferred: boolean,
): ChatConversationComposerConfig {
  return {
    clearOnSend: true,
    fileInputTestId: 'chat-file-upload-input',
    stopTestId: 'cancel',
    deferredSendCancellable: isDeferred,
    unavailableModel: options.isModelUnavailable
      ? { onNewChat: options.onNewChat }
      : undefined,
  };
}

function webComposerNotices(
  { thread, model, onNewChat }: WebConversationComposerOptions,
  t: ReturnType<typeof useTranslation<'chat'>>['t'],
) {
  return (
    <>
      <p className="mb-2 text-center text-xs text-muted-foreground">
        {t('chat.inputDisclaimer')}
      </p>
      {thread.isLongChat && (
        <LongChatWarning key={thread.id} onNewChat={onNewChat} />
      )}
      <AcademyGateNotice className="mb-2" />
      {model?.hasProviderFault && (
        <ProviderFaultNotice modelName={model.displayName} />
      )}
    </>
  );
}
