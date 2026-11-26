import type { RefObject } from 'react';
import { useMemo } from 'react';
import type { PermittedLanguageModelResponseDto } from '@ayunis/api-client';
import type { ChatConversationController } from '@ayunis/chat/surface';
import ChatInput, {
  getChatInputSubmissionState,
  type ChatInputRef,
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
import { sentPrompts } from '@/pages/chat/lib/sent-prompts';
import type { PendingImage } from '@ayunis/chat/runs';
import { getModeValue } from '@/widgets/model-select-options';
import { useTranslation } from 'react-i18next';
import LongChatWarning from '@/pages/chat/ui/LongChatWarning';
import UnavailableModelNotice from '@/pages/chat/ui/UnavailableModelNotice';
import ProviderFaultNotice from '@/pages/chat/ui/ProviderFaultNotice';
import { AcademyGateNotice } from '@/widgets/academy-gate-notice';

interface WebConversationComposerProps {
  readonly thread: Thread;
  readonly controller: ChatConversationController;
  readonly inputRef: RefObject<ChatInputRef | null>;
  readonly submission: ReturnType<typeof useThreadSubmissionState>;
  readonly files: ReturnType<typeof useChatFiles>;
  readonly hasProcessingSources: boolean;
  readonly isAcademyGated: boolean;
  readonly isEmbeddingModelEnabled: boolean;
  readonly model?: PermittedLanguageModelResponseDto;
  readonly isModelUnavailable: boolean;
  readonly addKnowledgeBase: (id: string) => void;
  readonly removeKnowledgeBase: (id: string) => void;
  readonly addIntegration: (id: string) => void;
  readonly removeIntegration: (id: string) => void;
}

export function WebConversationComposer({
  thread,
  controller,
  inputRef: composerRef,
  submission,
  files,
  hasProcessingSources,
  isAcademyGated,
  isEmbeddingModelEnabled,
  model,
  isModelUnavailable,
  addKnowledgeBase,
  removeKnowledgeBase,
  addIntegration,
  removeIntegration,
}: WebConversationComposerProps) {
  const { t } = useTranslation('chat');
  const isDeferred = useIsThreadRunDeferred(thread.id);
  usePendingMessage({
    threadId: thread.id,
    hasProcessingSources,
    resumeStartedRun: controller.resumeStartedRun,
  });
  const prompts = useMemo(
    () =>
      sentPrompts(
        controller.messages,
        controller.piiMasks,
        submission.pendingSubmission,
      ),
    [controller.messages, controller.piiMasks, submission.pendingSubmission],
  );
  const actions = useComposerActions(
    thread,
    controller,
    submission,
    composerRef,
    hasProcessingSources,
  );

  if (isModelUnavailable) return <UnavailableModelNotice />;
  return (
    <>
      <p className="mb-2 text-center text-xs text-muted-foreground">
        {t('chat.inputDisclaimer')}
      </p>
      {thread.isLongChat && <LongChatWarning key={thread.id} />}
      <AcademyGateNotice className="mb-2" />
      {model?.hasProviderFault && (
        <ProviderFaultNotice modelName={model.displayName} />
      )}
      <WebChatInput
        thread={thread}
        controller={controller}
        composerRef={composerRef}
        prompts={prompts}
        submission={submission}
        files={files}
        isDeferred={isDeferred}
        isAcademyGated={isAcademyGated}
        isEmbeddingModelEnabled={isEmbeddingModelEnabled}
        model={model}
        actions={actions}
        addKnowledgeBase={addKnowledgeBase}
        removeKnowledgeBase={removeKnowledgeBase}
        addIntegration={addIntegration}
        removeIntegration={removeIntegration}
      />
    </>
  );
}

function useComposerActions(
  thread: Thread,
  controller: ChatConversationController,
  submission: ReturnType<typeof useThreadSubmissionState>,
  composerRef: RefObject<ChatInputRef | null>,
  hasProcessingSources: boolean,
) {
  async function send(
    text: string,
    imageFiles?: Array<{ file: File; altText?: string }>,
    voiceInput?: boolean,
  ) {
    if (controller.isCheckingForRun || controller.isStreaming) return;
    submission.startSubmission(thread.id, {
      text,
      images: imageFiles?.map(({ file }) => file),
    });
    composerRef.current?.setMessage('');
    if (hasProcessingSources) {
      deferThreadRun({
        threadId: thread.id,
        text,
        images: imageFiles ?? [],
        voiceInput,
        messageCountBeforeSend: thread.messages.length,
      });
      return;
    }
    const images: PendingImage[] | undefined = imageFiles?.map((image) => ({
      file: image.file,
      altText: image.altText ?? 'Pasted image',
    }));
    await controller.send({ text, images, voiceInput });
  }

  function cancel() {
    if (cancelDeferredThreadRun(thread.id)) {
      submission.failSubmission(thread.id);
      return;
    }
    controller.stop();
    submission.resetSubmission(thread.id);
  }
  return { send, cancel };
}

interface WebChatInputProps extends Pick<
  WebConversationComposerProps,
  | 'thread'
  | 'controller'
  | 'submission'
  | 'files'
  | 'isAcademyGated'
  | 'isEmbeddingModelEnabled'
  | 'model'
  | 'addKnowledgeBase'
  | 'removeKnowledgeBase'
  | 'addIntegration'
  | 'removeIntegration'
> {
  readonly composerRef: RefObject<ChatInputRef | null>;
  readonly prompts: string[];
  readonly isDeferred: boolean;
  readonly actions: ReturnType<typeof useComposerActions>;
}

function WebChatInput({
  thread,
  controller,
  submission,
  files,
  isAcademyGated,
  isEmbeddingModelEnabled,
  model,
  addKnowledgeBase,
  removeKnowledgeBase,
  addIntegration,
  removeIntegration,
  composerRef,
  prompts,
  isDeferred,
  actions,
}: WebChatInputProps) {
  return (
    <ChatInput
      key={thread.id}
      ref={composerRef}
      draftChatId={thread.id}
      sentPrompts={prompts}
      modelId={
        thread.mode
          ? getModeValue(thread.mode)
          : (model?.id ?? thread.permittedModelId)
      }
      isModelChangeDisabled
      isAnonymousChangeDisabled
      sources={files.files}
      knowledgeBases={thread.knowledgeBases}
      mcpIntegrations={thread.mcpIntegrations}
      isAnonymous={thread.isAnonymous}
      submissionState={getChatInputSubmissionState(
        controller.isStreaming,
        submission.pendingSubmission,
      )}
      isSendDisabled={
        controller.isCheckingForRun || files.isUploading || isAcademyGated
      }
      onModelChange={() => undefined}
      onFileUpload={files.upload}
      onRemoveSource={files.remove}
      onAddKnowledgeBase={(kb) => addKnowledgeBase(kb.id)}
      onRemoveKnowledgeBase={removeKnowledgeBase}
      onAddIntegration={(integration) => addIntegration(integration.id)}
      onRemoveIntegration={removeIntegration}
      onSend={(text, images, _skill, voice) =>
        void actions.send(text, images, voice)
      }
      onCancel={actions.cancel}
      isCancelDisabled={!controller.isRunCancellable && !isDeferred}
      isEmbeddingModelEnabled={isEmbeddingModelEnabled}
      isVisionEnabled={model?.canVision ?? false}
    />
  );
}
