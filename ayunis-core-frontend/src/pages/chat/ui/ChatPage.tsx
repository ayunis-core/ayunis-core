import { useState, useRef, useCallback, useMemo } from 'react';
import ChatInterfaceLayout from '@/layouts/chat-interface-layout/ui/ChatInterfaceLayout';
import { ChatThreadContent } from '@/pages/chat/ui/ChatThreadContent';
import { ChatContextHint } from '@/pages/chat/ui/ChatContextHint';
import ChatInput, { getChatInputSubmissionState } from '@/widgets/chat-input';
import { useMessageSend } from '@/pages/chat/api/useMessageSend';
import ChatHeader from './ChatHeader';
import LongChatWarning from './LongChatWarning';
import UnavailableModelNotice from './UnavailableModelNotice';
import ProviderFaultNotice from './ProviderFaultNotice';
import type { Thread } from '@/pages/chat/model/openapi';
import { useThreadSubmissionState } from '@/pages/chat/hooks/useThreadSubmissionState';
import type { ThreadSubmission } from '@/pages/chat/model/pending-submissions';
import { showError } from '@/shared/lib/toast';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { RenameThreadDialog } from '@/widgets/rename-thread-dialog';
import {
  cancelDeferredThreadRun,
  deferThreadRun,
  useDeleteThread,
  useIsThreadRunActive,
} from '@/features/thread-run';
import { useAcademyAccessStatus } from '@/features/academy';
import { AcademyGateNotice } from '@/widgets/academy-gate-notice';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import type { RunThreadResponseDto } from '@/shared/api';
import { PiiMaskProvider } from '@/widgets/markdown';
import type { PiiMaskEntry } from '@/widgets/markdown';
import type { ArtifactPanelHandle } from '@/shared/model/artifact-panel';
import { useUnmaskPiiMask } from '@/pages/chat/api/useUnmaskPiiMask';
import { useRunErrorHandler } from '@/pages/chat/hooks/useRunErrorHandler';
import { useLetterheadChange } from '@/pages/chat/hooks/useLetterheadChange';
import { usePendingMessage } from '@/pages/chat/hooks/usePendingMessage';
import { useThreadRunReattach } from '@/pages/chat/hooks/useThreadRunReattach';
import AppLayout from '@/layouts/app-layout';
import type { ChatInputRef } from '@/widgets/chat-input/ui/ChatInput';
import { useSourceProcessingProgress } from '@/pages/chat/api/useSourceProcessingProgress';
import { useChatSourceAttachments } from '@/pages/chat/api/useChatSourceAttachments';
import { useDeleteFileSource } from '@/pages/chat/api/useDeleteFileSource';
import { useArtifactActions } from '@/pages/chat/hooks/useArtifactActions';
import { usePermittedModels } from '@/features/usePermittedModels';
import { useQueryClient } from '@tanstack/react-query';
import { getThreadsControllerFindAllQueryKey } from '@/shared/api/generated/ayunisCoreAPI';
import { useChatThread } from '@/pages/chat/api/useChatThread';
import { useKnowledgeBaseAttachment } from '@/pages/chat/api/useKnowledgeBaseAttachment';
import { useMcpIntegrationAttachment } from '@/pages/chat/api/useMcpIntegrationAttachment';
import type { PendingImage } from '@/pages/chat/api/useMessageSend';
import { mergePiiMasks } from '@/pages/chat/lib/merge-pii-masks';
import { sentPrompts } from '@/pages/chat/lib/sent-prompts';
import { removePendingToolCalls } from '@/pages/chat/lib/remove-pending-tool-calls';
import { useChatThreadState } from '@/pages/chat/hooks/useChatThreadState';
import { useRenderUnits } from '@/pages/chat/hooks/useRenderUnits';
import { useToolCallDecisions } from '@/pages/chat/hooks/useToolCallDecisions';
import { ToolCallConfirmationContext } from '@/pages/chat/ui/agent-run-timeline';
import { ChatSidePanel } from './ChatSidePanel';
import { useChatSidePanelTransitions } from '@/pages/chat/hooks/useChatSidePanelTransitions';
import { useChatSidePanelState } from '@/pages/chat/hooks/useChatSidePanelState';
import SourceCitationController from './SourceCitationController';
import { getModeValue } from '@/widgets/model-select-options';
import { findThreadModel } from '@/pages/chat/lib/find-thread-model';
import { ProductiveOutcomeProvider } from '@/shared/lib/openpanel-outcomes';

interface ChatPageProps {
  readonly thread: Thread;
  readonly isEmbeddingModelEnabled: boolean;
  readonly initialArtifactId?: string;
}

export default function ChatPage({
  thread: initialThread,
  isEmbeddingModelEnabled,
  initialArtifactId,
}: ChatPageProps) {
  const { t } = useTranslation('chat');
  const { confirm } = useConfirmation();
  const navigate = useNavigate();
  const {
    models,
    isLoading: isLoadingModels,
    error: isModelsError,
  } = usePermittedModels();
  const isStreaming = useIsThreadRunActive(initialThread.id);
  const { thread, hasProcessingSources } = useChatThread(
    initialThread,
    isStreaming,
  );

  const selectedModel = findThreadModel(models, thread);
  const isVisionEnabled = selectedModel?.canVision ?? false;

  // A loading or errored models query must not hide the input (AYC-666).
  const isModelUnavailable = useMemo(() => {
    if (thread.permittedModelId)
      return !isLoadingModels && !isModelsError && !selectedModel;
    return false;
  }, [thread.permittedModelId, selectedModel, isLoadingModels, isModelsError]);

  const queryClient = useQueryClient();
  const chatInputRef = useRef<ChatInputRef>(null);
  const artifactPanelRef = useRef<ArtifactPanelHandle>(null);

  const {
    messages,
    setMessages,
    piiMasks,
    setPiiMasks,
    threadTitle,
    setThreadTitle,
    handleMessage,
    handleMasks,
  } = useChatThreadState(thread, isStreaming);

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const sidePanelState = useChatSidePanelState(thread.id, initialArtifactId);
  const {
    artifactPanel,
    isExporting,
    handleSaveArtifact,
    handleRevertArtifact,
    handleExportArtifact,
  } = useArtifactActions(thread.id, initialArtifactId, thread.workspaceId);

  const { handleLetterheadChange } = useLetterheadChange({
    artifactId: artifactPanel.artifact?.id ?? '',
    threadId: thread.id,
    workspaceId: thread.workspaceId,
  });
  const sidePanelTransitions = useChatSidePanelTransitions({
    artifactPanelRef,
    isArtifactDetailOpen: sidePanelState.view === 'artifact-detail',
    openArtifact: sidePanelState.openArtifact,
    toggleArtifactPanel: sidePanelState.toggle,
    changeTab: sidePanelState.openTab,
  });

  const { deleteChat } = useDeleteThread({
    onBeforeDelete: resetRunState,
    onSuccess: () => {
      void navigate({ to: '/chat' });
    },
    onError: (error) => {
      console.error('Failed to delete thread', error);
      showError(t('chat.errorDeleteThread'));
    },
  });

  const { isGated: isAcademyGated } = useAcademyAccessStatus();
  const attachments = useChatSourceAttachments(thread);
  const {
    isDeferred,
    attachments: pendingUploads,
    composerSources: sourcesWithUploads,
  } = attachments;
  const waitingForFiles = hasProcessingSources || pendingUploads.length > 0;
  const sourceProgress = useSourceProcessingProgress(
    thread.id,
    hasProcessingSources,
  );
  const { deleteFileSource } = useDeleteFileSource({
    threadId: thread.id,
  });

  const { addKnowledgeBase, removeKnowledgeBase } = useKnowledgeBaseAttachment({
    threadId: thread.id,
  });
  const { addIntegration, removeIntegration } = useMcpIntegrationAttachment({
    threadId: thread.id,
  });
  const { unmaskPiiMask } = useUnmaskPiiMask({
    threadId: thread.id,
    onSuccess: (masks) =>
      setPiiMasks((current) => mergePiiMasks(current, masks)),
  });

  const handleUnmaskRequest = useCallback(
    (entry: PiiMaskEntry) => {
      confirm({
        title: t('chat.piiMask.unmaskTitle', { value: entry.value }),
        description: t('chat.piiMask.unmaskDescription'),
        confirmText: t('chat.piiMask.unmaskConfirm'),
        cancelText: t('chat.piiMask.unmaskCancel'),
        variant: 'destructive',
        onConfirm: () => unmaskPiiMask(entry.id),
      });
    },
    [confirm, t, unmaskPiiMask],
  );

  const handleFileUpload = attachments.upload;

  const handleError = useRunErrorHandler(thread.id);

  const restoreFailedSubmission = useCallback(
    (submission: ThreadSubmission) =>
      chatInputRef.current?.restoreFailedSubmission(
        submission.text,
        submission.images ?? [],
      ),
    [],
  );
  const handleRestoreBlocked = useCallback(
    () => showError(t('chat.errorRestoreFailedSubmission')),
    [t],
  );
  const {
    pendingSubmission,
    startSubmission,
    clearPendingSubmission,
    completeSubmission,
    failSubmission,
    resetSubmission,
  } = useThreadSubmissionState({
    threadId: thread.id,
    isStreaming,
    restoreFailedSubmission,
    onRestoreBlocked: handleRestoreBlocked,
  });
  const threadPrompts = useMemo(
    () => sentPrompts(messages, piiMasks, pendingSubmission),
    [messages, piiMasks, pendingSubmission],
  );

  const handleThread = useCallback(
    (thread: RunThreadResponseDto) => {
      setThreadTitle(thread.title);
      void queryClient.invalidateQueries({
        queryKey: getThreadsControllerFindAllQueryKey(),
      });
    },
    [queryClient, setThreadTitle],
  );

  const { sendTextMessage, sendToolCallDecisions, attach, abort } =
    useMessageSend({
      threadId: thread.id,
      onMessageReceived: () => clearPendingSubmission(thread.id),
      onMessageEvent: (data) => handleMessage(data.message),
      onErrorEvent: handleError,
      onThreadEvent: handleThread,
      onMasksEvent: handleMasks,
      onError: (error) => {
        console.error('Error in useMessageSend:', error);
        showError(t('chat.errorSendMessage'));
      },
      onComplete: (failed) => completeSubmission(thread.id, failed),
    });
  const toolCallConfirmation = useToolCallDecisions({
    messages,
    isStreaming,
    sendDecisions: sendToolCallDecisions,
  });

  const { isRunCancellable } = useThreadRunReattach({
    threadId: thread.id,
    isStreaming,
    attach,
  });

  usePendingMessage({
    threadId: thread.id,
    loadedMessageCount: thread.messages.length,
    hasProcessingSources: waitingForFiles,
    sendTextMessage,
  });

  const isSendDisabled = isAcademyGated;

  async function handleSend(
    message: string,
    imageFiles?: Array<{ file: File; altText?: string }>,
    voiceInput?: boolean,
  ) {
    try {
      startSubmission(thread.id, {
        text: message,
        images: imageFiles?.map((img) => img.file),
      });
      chatInputRef.current?.setMessage('');
      attachments.submit();
      if (waitingForFiles) {
        deferThreadRun({
          threadId: thread.id,
          text: message,
          images: imageFiles ?? [],
          voiceInput,
          messageCountBeforeSend: thread.messages.length,
        });
        return;
      }

      const images: PendingImage[] | undefined =
        imageFiles && imageFiles.length > 0
          ? imageFiles.map((img) => ({
              file: img.file,
              altText: img.altText ?? 'Pasted image',
            }))
          : undefined;

      await sendTextMessage({ text: message, images, voiceInput });
    } catch {
      // Run errors arrive as SSE/HTTP events (handled in useMessageSend's
      // onErrorEvent/onError); this only catches a rejected send promise.
      failSubmission(thread.id);
    }
  }

  function resetRunState() {
    resetSubmission(thread.id);
  }

  function handleSendCancelled() {
    // A first message still waiting for its files goes back into the input.
    if (cancelDeferredThreadRun(thread.id)) {
      failSubmission(thread.id);
      return;
    }
    abort();
    resetRunState();
    setMessages(removePendingToolCalls);
  }

  function handleDeleteThread() {
    confirm({
      title: t('chat.deleteThreadTitle'),
      description: t('chat.deleteThreadDescription'),
      confirmText: t('chat.deleteText'),
      cancelText: t('chat.cancelText'),
      variant: 'destructive',
      onConfirm: () => deleteChat(thread.id),
    });
  }

  function handleRenameThread() {
    // Delay to allow dropdown menu to fully close first
    setTimeout(() => setRenameDialogOpen(true), 0);
  }

  const chatHeader = (
    <ChatHeader
      threadId={thread.id}
      threadTitle={threadTitle}
      isAnonymous={thread.isAnonymous}
      workspaceId={thread.workspaceId}
      sourceNotificationId={thread.sourceNotificationId}
      isArtifactPanelOpen={sidePanelState.isOpen}
      onToggleArtifactPanel={sidePanelTransitions.toggleArtifactPanel}
      onRename={handleRenameThread}
      onDelete={handleDeleteThread}
    />
  );

  const renderUnits = useRenderUnits(messages, {
    isStreaming,
    hasPendingUserTurn: pendingSubmission !== null,
  });

  const lastUnitKind =
    renderUnits.length > 0
      ? renderUnits[renderUnits.length - 1].kind
      : undefined;
  const showLoadingPlaceholder =
    pendingSubmission !== null || (isStreaming && lastUnitKind === 'user');

  const chatContent = (
    <ToolCallConfirmationContext.Provider value={toolCallConfirmation}>
      <ChatThreadContent
        renderUnits={renderUnits}
        threadId={thread.id}
        pendingSubmission={pendingSubmission}
        contextHint={
          <ChatContextHint
            threadId={thread.id}
            workspaceId={thread.workspaceId}
            onOpen={() => sidePanelTransitions.changeTab('context')}
          />
        }
        attachmentData={{
          sources: attachments.conversationSources,
          uploads: pendingUploads,
          messages,
          progress: sourceProgress.data,
        }}
        onRemoveSource={deleteFileSource}
        onRemoveUpload={attachments.remove}
        showLoadingPlaceholder={showLoadingPlaceholder && !waitingForFiles}
        onOpenArtifact={sidePanelTransitions.openArtifactPanel}
      />
    </ToolCallConfirmationContext.Provider>
  );

  const chatInput = isModelUnavailable ? (
    <UnavailableModelNotice />
  ) : (
    <>
      <p className="text-xs text-muted-foreground text-center mb-2">
        {t('chat.inputDisclaimer')}
      </p>
      {thread.isLongChat && <LongChatWarning key={thread.id} />}
      <AcademyGateNotice className="mb-2" />
      {selectedModel?.hasProviderFault && (
        <ProviderFaultNotice modelName={selectedModel.displayName} />
      )}
      <ChatInput
        key={thread.id}
        ref={chatInputRef}
        draftChatId={thread.id}
        sentPrompts={threadPrompts}
        modelId={
          thread.mode
            ? getModeValue(thread.mode)
            : (selectedModel?.id ?? thread.permittedModelId)
        }
        isModelChangeDisabled={true}
        isAnonymousChangeDisabled={true}
        sources={sourcesWithUploads}
        knowledgeBases={thread.knowledgeBases}
        mcpIntegrations={thread.mcpIntegrations}
        isAnonymous={thread.isAnonymous}
        submissionState={getChatInputSubmissionState(
          isStreaming,
          pendingSubmission,
        )}
        isSendDisabled={isSendDisabled}
        onModelChange={() => {}}
        onFileUpload={handleFileUpload}
        onRemoveSource={(id) =>
          pendingUploads.some((upload) => upload.id === id)
            ? attachments.remove(id)
            : deleteFileSource(id)
        }
        onAddKnowledgeBase={(kb) => addKnowledgeBase(kb.id)}
        onRemoveKnowledgeBase={removeKnowledgeBase}
        onAddIntegration={(integration) => addIntegration(integration.id)}
        onRemoveIntegration={removeIntegration}
        onSend={(m, imageFiles, _skillId, voiceInput) =>
          void handleSend(m, imageFiles, voiceInput)
        }
        onCancel={handleSendCancelled}
        isCancelDisabled={!isRunCancellable && !isDeferred}
        isEmbeddingModelEnabled={isEmbeddingModelEnabled}
        isVisionEnabled={isVisionEnabled}
      />
    </>
  );

  const sidePanel = sidePanelState.isOpen ? (
    <ChatSidePanel
      threadId={thread.id}
      view={sidePanelState.view}
      artifactPanelRef={artifactPanelRef}
      artifactPanelProps={{
        ...artifactPanel,
        onBack: () => sidePanelState.openTab('artifacts'),
        onClose: sidePanelState.close,
        onSave: handleSaveArtifact,
        onRevert: handleRevertArtifact,
        onExport: handleExportArtifact,
        onLetterheadChange: handleLetterheadChange,
        isExporting,
      }}
      onSelectArtifact={sidePanelTransitions.openArtifactPanel}
      onTabChange={sidePanelTransitions.changeTab}
      onClose={sidePanelTransitions.toggleArtifactPanel}
    />
  ) : undefined;
  return (
    <AppLayout>
      <ProductiveOutcomeProvider threadId={thread.id}>
        <PiiMaskProvider masks={piiMasks} onUnmaskRequest={handleUnmaskRequest}>
          <SourceCitationController key={thread.id} threadId={thread.id}>
            <ChatInterfaceLayout
              chatHeader={chatHeader}
              chatContent={chatContent}
              chatInput={chatInput}
              resetKey={thread.id}
              sidePanel={sidePanel}
            />
          </SourceCitationController>
        </PiiMaskProvider>
      </ProductiveOutcomeProvider>
      <RenameThreadDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        threadId={thread.id}
        currentTitle={threadTitle ?? null}
      />
    </AppLayout>
  );
}
