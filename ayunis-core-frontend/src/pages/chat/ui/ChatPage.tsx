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
import { useDeleteThread, useIsThreadRunActive } from '@/features/thread-run';
import { useAcademyAccessStatus } from '@/features/academy';
import { AcademyGateNotice } from '@/widgets/academy-gate-notice';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import type { RunThreadResponseDto } from '@/shared/api';
import { PiiMaskProvider } from '@/widgets/markdown';
import type { PiiMaskEntry } from '@/widgets/markdown';
import type { ArtifactPanelHandle } from '@/shared/model/artifact-panel';
import { useUnmaskPiiMask } from '@/pages/chat/api/useUnmaskPiiMask';
import { SourceResponseDtoStatus } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useRunErrorHandler } from '@/pages/chat/hooks/useRunErrorHandler';
import { useLetterheadChange } from '@/pages/chat/hooks/useLetterheadChange';
import { usePendingMessage } from '@/pages/chat/hooks/usePendingMessage';
import { useThreadRunReattach } from '@/pages/chat/hooks/useThreadRunReattach';
import AppLayout from '@/layouts/app-layout';
import type { ChatInputRef } from '@/widgets/chat-input/ui/ChatInput';
import { useCreateFileSource } from '@/pages/chat/api/useCreateFileSource';
import type { PendingSourceUpload } from '@/shared/lib/source-upload';
import { useDeleteFileSource } from '@/pages/chat/api/useDeleteFileSource';
import { useArtifactActions } from '@/pages/chat/hooks/useArtifactActions';
import { usePermittedModels } from '@/features/usePermittedModels';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import {
  getThreadsControllerFindAllQueryKey,
  getThreadsControllerFindOneQueryKey,
  threadsControllerFindOne,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useKnowledgeBaseAttachment } from '@/pages/chat/api/useKnowledgeBaseAttachment';
import { useMcpIntegrationAttachment } from '@/pages/chat/api/useMcpIntegrationAttachment';
import type { PendingImage } from '@/pages/chat/api/useMessageSend';
import { mergePiiMasks } from '@/pages/chat/lib/merge-pii-masks';
import { sentPrompts } from '@/pages/chat/lib/sent-prompts';
import { removePendingToolCalls } from '@/pages/chat/lib/remove-pending-tool-calls';
import { useChatThreadState } from '@/pages/chat/hooks/useChatThreadState';
import { useRenderUnits } from '@/pages/chat/hooks/useRenderUnits';
import { ChatSidePanel } from './ChatSidePanel';
import { useChatSidePanelTransitions } from '@/pages/chat/hooks/useChatSidePanelTransitions';
import { useChatSidePanelState } from '@/pages/chat/hooks/useChatSidePanelState';
import SourceCitationController from './SourceCitationController';
import { getModeValue } from '@/widgets/model-select-options';
import { findThreadModel } from '@/pages/chat/lib/find-thread-model';
import { useProcessingPollInterval } from '@/shared/lib/processing-poll';

interface ChatPageProps {
  readonly thread: Thread;
  readonly isEmbeddingModelEnabled: boolean;
  readonly initialArtifactId?: string;
}

/** A file still in transfer, shown as a chip beside the thread's sources. */
function toPendingSource(upload: PendingSourceUpload) {
  return {
    id: upload.id,
    name: upload.fileName,
    type: 'text' as const,
    status: 'processing' as const,
    uploadProgress: upload.progress,
  };
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
  const processingPollInterval = useProcessingPollInterval(initialThread.id);
  const { data: thread = initialThread } = useQuery({
    queryKey: getThreadsControllerFindOneQueryKey(initialThread.id),
    queryFn: () => threadsControllerFindOne(initialThread.id),
    initialData: initialThread,
    staleTime: 0,
    // eslint-disable-next-line sonarjs/function-return-type -- React Query's refetchInterval expects number | false
    refetchInterval: (query) => {
      // Polling during streaming can replace local output with stale persisted text.
      if (isStreaming) return false;
      const data = query.state.data;
      if (!data) return false;
      const hasProcessing = data.sources.some(
        (s) => s.status === SourceResponseDtoStatus.processing,
      );
      return processingPollInterval(hasProcessing);
    },
  });

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
  const {
    createFileSource,
    isLoading: isCreatingFileSource,
    uploads: pendingUploads,
  } = useCreateFileSource({
    threadId: thread.id,
  });
  const sourcesWithUploads = useMemo(
    () => [...thread.sources, ...pendingUploads.map(toPendingSource)],
    [thread.sources, pendingUploads],
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

  const handleFileUpload = (files: File[]) =>
    files.forEach((file) => createFileSource({ file }));

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

  const { sendTextMessage, attach, abort } = useMessageSend({
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

  const { isRunCancellable } = useThreadRunReattach({
    threadId: thread.id,
    isStreaming,
    attach,
  });

  const hasProcessingSources = thread.sources.some(
    (s) => s.status === SourceResponseDtoStatus.processing,
  );

  usePendingMessage({
    threadId: thread.id,
    hasLoadedMessages: thread.messages.length > 0,
    sendTextMessage,
  });

  // Send is gated while a fresh upload is in flight or while server-side
  // processing of an attached source hasn't finished — both are reasons we
  // want the user to wait before they can submit a message. The academy gate
  // adds a third: the org requires a certificate this user does not hold.
  const isSendDisabled =
    isCreatingFileSource || hasProcessingSources || isAcademyGated;

  async function handleSend(
    message: string,
    imageFiles?: Array<{ file: File; altText?: string }>,
  ) {
    try {
      startSubmission(thread.id, {
        text: message,
        images: imageFiles?.map((img) => img.file),
      });
      chatInputRef.current?.setMessage('');

      const images: PendingImage[] | undefined =
        imageFiles && imageFiles.length > 0
          ? imageFiles.map((img) => ({
              file: img.file,
              altText: img.altText ?? 'Pasted image',
            }))
          : undefined;

      await sendTextMessage({
        text: message,
        images,
      });
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
      showLoadingPlaceholder={showLoadingPlaceholder}
      onOpenArtifact={sidePanelTransitions.openArtifactPanel}
    />
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
        onRemoveSource={deleteFileSource}
        onAddKnowledgeBase={(kb) => addKnowledgeBase(kb.id)}
        onRemoveKnowledgeBase={removeKnowledgeBase}
        onAddIntegration={(integration) => addIntegration(integration.id)}
        onRemoveIntegration={removeIntegration}
        onSend={(m, imageFiles) => void handleSend(m, imageFiles)}
        onCancel={handleSendCancelled}
        isCancelDisabled={!isRunCancellable}
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
      <RenameThreadDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        threadId={thread.id}
        currentTitle={threadTitle ?? null}
      />
    </AppLayout>
  );
}
