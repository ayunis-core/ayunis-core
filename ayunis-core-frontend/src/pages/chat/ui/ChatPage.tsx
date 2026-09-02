import {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react';
import ChatInterfaceLayout from '@/layouts/chat-interface-layout/ui/ChatInterfaceLayout';
import { ChatThreadContent } from '@/pages/chat/ui/ChatThreadContent';
import { groupMessagesIntoRuns } from '@/pages/chat/ui/agent-run-timeline';
import ChatInput, { getChatInputSubmissionState } from '@/widgets/chat-input';
import { useMessageSend } from '@/pages/chat/api/useMessageSend';
import ChatHeader from './ChatHeader';
import LongChatWarning from './LongChatWarning';
import UnavailableModelNotice from './UnavailableModelNotice';
import ProviderFaultNotice from './ProviderFaultNotice';
import type { Thread } from '@/pages/chat/model/openapi';
import { showError } from '@/shared/lib/toast';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { RenameThreadDialog } from '@/widgets/rename-thread-dialog';
import { useDeleteThread } from '@/features/thread-run';
import { useAcademyAccessStatus } from '@/features/academy';
import { AcademyGateNotice } from '@/widgets/academy-gate-notice';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import type { RunSessionResponseDto, RunThreadResponseDto } from '@/shared/api';
import { PiiMaskProvider } from '@/widgets/markdown';
import type { PiiMaskEntry } from '@/widgets/markdown';
import { useUnmaskPiiMask } from '@/pages/chat/api/useUnmaskPiiMask';
import { SourceResponseDtoStatus } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useRunErrorHandler } from '@/pages/chat/hooks/useRunErrorHandler';
import { useLetterheadChange } from '@/pages/chat/hooks/useLetterheadChange';
import { usePendingMessage } from '@/pages/chat/hooks/usePendingMessage';
import AppLayout from '@/layouts/app-layout';
import type { ChatInputRef } from '@/widgets/chat-input/ui/ChatInput';
import { useCreateFileSource } from '@/pages/chat/api/useCreateFileSource';
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
import { useDownloadSource } from '@/pages/chat/api/useDownloadSource';
import type { PendingImage } from '@/pages/chat/api/useMessageSend';
import { mergePiiMasks } from '@/pages/chat/lib/merge-pii-masks';
import { useChatThreadState } from '@/pages/chat/hooks/useChatThreadState';
import { ArtifactSidePanel } from './ArtifactSidePanel';
import { WorkspaceContextSidePanel } from './WorkspaceContextSidePanel';
import { useWorkspaceContextPanel } from '@/pages/chat/hooks/useWorkspaceContextPanel';

const PROCESSING_POLL_INTERVAL = 5000;

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
  const [isStreaming, setIsStreaming] = useState(false);
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
      return hasProcessing ? PROCESSING_POLL_INTERVAL : false;
    },
  });

  const selectedModel = models.find((m) => m.id === thread.permittedModelId);
  const isVisionEnabled = selectedModel?.canVision ?? false;

  // A loading or errored models query must not hide the input (AYC-666).
  const isModelUnavailable = useMemo(() => {
    if (thread.permittedModelId)
      return !isLoadingModels && !isModelsError && !selectedModel;
    return false;
  }, [thread.permittedModelId, selectedModel, isLoadingModels, isModelsError]);

  const queryClient = useQueryClient();
  const chatInputRef = useRef<ChatInputRef>(null);
  const lastSubmissionRef = useRef<{ text: string; images?: File[] } | null>(
    null,
  );

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

  useEffect(() => {
    lastSubmissionRef.current = null;
  }, [thread.id]);
  const [pendingSubmission, setPendingSubmission] = useState<string | null>(
    null,
  );
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const {
    artifactPanel,
    isArtifactPanelOpen,
    isExporting,
    handleOpenArtifact,
    handleSaveArtifact,
    handleRevertArtifact,
    handleExportArtifact,
    handleCloseArtifact,
  } = useArtifactActions(thread.id, initialArtifactId, thread.workspaceId);

  const { handleLetterheadChange } = useLetterheadChange({
    artifactId: artifactPanel.artifact?.id ?? '',
    threadId: thread.id,
    workspaceId: thread.workspaceId,
  });
  const {
    context: workspaceContext,
    panel: workspaceContextPanel,
    toggle: toggleWorkspaceContextPanel,
    close: closeWorkspaceContextPanel,
  } = useWorkspaceContextPanel({
    workspaceId: thread.workspaceId,
    onOpen: handleCloseArtifact,
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
  const { createFileSource, isLoading: isCreatingFileSource } =
    useCreateFileSource({
      threadId: thread.id,
    });
  const { deleteFileSource } = useDeleteFileSource({
    threadId: thread.id,
  });

  const { addKnowledgeBase, removeKnowledgeBase } = useKnowledgeBaseAttachment({
    threadId: thread.id,
  });
  const { addIntegration, removeIntegration } = useMcpIntegrationAttachment({
    threadId: thread.id,
  });
  const { downloadSource } = useDownloadSource(thread);

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

  const restoreFailedSubmission = useCallback(() => {
    const last = lastSubmissionRef.current;
    if (!last) return;
    // false = a follow-up draft blocked restore; warn instead of dropping silently.
    const restored = chatInputRef.current?.restoreFailedSubmission(
      last.text,
      last.images ?? [],
    );
    if (restored === false) showError(t('chat.errorRestoreFailedSubmission'));
  }, [t]);

  const handleSession = useCallback((session: RunSessionResponseDto) => {
    if (session.streaming === true) setIsStreaming(true);
    if (session.streaming === false) setIsStreaming(false);
  }, []);

  const handleThread = useCallback(
    (thread: RunThreadResponseDto) => {
      setThreadTitle(thread.title);
      void queryClient.invalidateQueries({
        queryKey: getThreadsControllerFindAllQueryKey(),
      });
    },
    [queryClient, setThreadTitle],
  );

  const { sendTextMessage, abort } = useMessageSend({
    threadId: thread.id,
    onMessageEvent: (data) => {
      setPendingSubmission(null);
      handleMessage(data.message);
    },
    onErrorEvent: handleError,
    onSessionEvent: handleSession,
    onThreadEvent: handleThread,
    onMasksEvent: handleMasks,
    onError: (error) => {
      console.error('Error in useMessageSend:', error);
      showError(t('chat.errorSendMessage'));
    },
    onComplete: (failed) => {
      if (failed) restoreFailedSubmission();
      lastSubmissionRef.current = null;
      setIsStreaming(false);
      setPendingSubmission(null);
    },
  });

  const hasProcessingSources = thread.sources.some(
    (s) => s.status === SourceResponseDtoStatus.processing,
  );

  usePendingMessage({
    sendTextMessage,
    onSendStart: (text, images) => {
      lastSubmissionRef.current = { text, images: images?.map((i) => i.file) };
      setPendingSubmission(text);
      setIsStreaming(true);
    },
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
      lastSubmissionRef.current = {
        text: message,
        images: imageFiles?.map((img) => img.file),
      };
      setPendingSubmission(message);
      setIsStreaming(true);
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
      restoreFailedSubmission();
    }
  }

  function resetRunState() {
    lastSubmissionRef.current = null;
    setIsStreaming(false);
    setPendingSubmission(null);
  }

  function removePendingToolCalls() {
    setMessages((prev) => {
      const lastMessage = prev[prev.length - 1];
      // eslint-disable-next-line eqeqeq, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-optional-chain -- guard against empty prev array where lastMessage would be undefined
      if (lastMessage != null && lastMessage.role === 'assistant') {
        const cleanedContent = lastMessage.content.filter(
          (c) => c.type === 'text' || c.type === 'thinking',
        );

        // If there's content left after filtering, update the message
        if (cleanedContent.length > 0) {
          return prev.map((msg, index) =>
            index === prev.length - 1
              ? { ...lastMessage, content: cleanedContent }
              : msg,
          );
        }
      }
      return prev;
    });
  }

  function handleSendCancelled() {
    abort();
    resetRunState();
    removePendingToolCalls();
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

  function openArtifactPanel(artifactId: string) {
    closeWorkspaceContextPanel();
    handleOpenArtifact(artifactId);
  }

  const chatHeader = (
    <ChatHeader
      threadId={thread.id}
      threadTitle={threadTitle}
      isAnonymous={thread.isAnonymous}
      workspaceId={thread.workspaceId}
      workspaceContext={workspaceContext}
      activeWorkspaceContextPanel={workspaceContextPanel}
      onToggleWorkspaceContextPanel={toggleWorkspaceContextPanel}
      onRename={handleRenameThread}
      onDelete={handleDeleteThread}
    />
  );

  const renderUnits = useMemo(
    () =>
      groupMessagesIntoRuns(messages, {
        isStreaming,
        hasPendingUserTurn: pendingSubmission !== null,
      }),
    [messages, isStreaming, pendingSubmission],
  );

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
      showLoadingPlaceholder={showLoadingPlaceholder}
      onOpenArtifact={openArtifactPanel}
    />
  );

  const chatInput = isModelUnavailable ? (
    <UnavailableModelNotice />
  ) : (
    <>
      <p className="text-xs text-muted-foreground text-center mb-2">
        {t('chat.inputDisclaimer')}
      </p>
      {thread.isLongChat && <LongChatWarning />}
      <AcademyGateNotice className="mb-2" />
      {selectedModel?.hasProviderFault && (
        <ProviderFaultNotice modelName={selectedModel.displayName} />
      )}
      <ChatInput
        key={thread.id}
        ref={chatInputRef}
        modelId={thread.permittedModelId}
        isModelChangeDisabled={true}
        isAnonymousChangeDisabled={true}
        sources={thread.sources}
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
        onDownloadSource={(sourceId) => void downloadSource(sourceId)}
        onAddKnowledgeBase={(kb) => addKnowledgeBase(kb.id)}
        onRemoveKnowledgeBase={removeKnowledgeBase}
        onAddIntegration={(integration) => addIntegration(integration.id)}
        onRemoveIntegration={removeIntegration}
        onSend={(m, imageFiles) => void handleSend(m, imageFiles)}
        onCancel={handleSendCancelled}
        isEmbeddingModelEnabled={isEmbeddingModelEnabled}
        isVisionEnabled={isVisionEnabled}
      />
    </>
  );

  let sidePanel: ReactNode;
  if (isArtifactPanelOpen) {
    sidePanel = (
      <ArtifactSidePanel
        {...artifactPanel}
        onSave={handleSaveArtifact}
        onRevert={handleRevertArtifact}
        onExport={handleExportArtifact}
        onLetterheadChange={handleLetterheadChange}
        isExporting={isExporting}
      />
    );
  } else if (workspaceContextPanel && workspaceContext) {
    sidePanel = (
      <WorkspaceContextSidePanel
        context={workspaceContext}
        panel={workspaceContextPanel}
        onClose={closeWorkspaceContextPanel}
      />
    );
  }
  return (
    <AppLayout>
      <PiiMaskProvider masks={piiMasks} onUnmaskRequest={handleUnmaskRequest}>
        <ChatInterfaceLayout
          chatHeader={chatHeader}
          chatContent={chatContent}
          chatInput={chatInput}
          resetKey={thread.id}
          sidePanel={sidePanel}
        />
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
