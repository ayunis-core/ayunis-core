import { useState, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import ChatInterfaceLayout from '@/layouts/chat-interface-layout/ui/ChatInterfaceLayout';
import { ChatThreadContent } from '@/pages/chat/ui/ChatThreadContent';
import { groupMessagesIntoRuns } from '@/pages/chat/ui/agent-run-timeline';
import ChatInput, { getChatInputSubmissionState } from '@/widgets/chat-input';
import { useMessageSend } from '../api/useMessageSend';
import ChatHeader from './ChatHeader';
import LongChatWarning from './LongChatWarning';
import type { Thread, Message } from '../model/openapi';
import { showError } from '@/shared/lib/toast';
import config from '@/shared/config';

import { useConfirmation } from '@/widgets/confirmation-modal';
import { RenameThreadDialog } from '@/widgets/rename-thread-dialog';
import { useDeleteThread } from '@/features/useDeleteThread';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import type {
  PiiMaskResponseDto,
  RunMasksResponseDto,
  RunMessageResponseDtoMessage,
  RunSessionResponseDto,
  RunThreadResponseDto,
} from '@/shared/api';
import { PiiMaskProvider } from '@/widgets/markdown';
import { SourceResponseDtoStatus } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useRunErrorHandler } from '../hooks/useRunErrorHandler';
import { useLetterheadChange } from '../hooks/useLetterheadChange';
import { usePendingMessage } from '../hooks/usePendingMessage';
import AppLayout from '@/layouts/app-layout';
import type { ChatInputRef } from '@/widgets/chat-input/ui/ChatInput';
import { useCreateFileSource } from '@/pages/chat/api/useCreateFileSource';
import { useDeleteFileSource } from '../api/useDeleteFileSource';
import { useArtifactActions } from '../hooks/useArtifactActions';
import { usePermittedModels } from '@/features/usePermittedModels';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import {
  getThreadsControllerFindAllQueryKey,
  getThreadsControllerFindOneQueryKey,
  threadsControllerFindOne,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useKnowledgeBaseAttachment } from '../api/useKnowledgeBaseAttachment';
import { useMcpIntegrationAttachment } from '../api/useMcpIntegrationAttachment';
import { useDownloadSource } from '../api/useDownloadSource';
import type { PendingImage } from '../api/useMessageSend';

const LazyArtifactEditor = lazy(() =>
  import('@/widgets/artifact-editor').then((m) => ({
    default: m.ArtifactEditor,
  })),
);

const LazyDiagramViewer = lazy(() =>
  import('@/widgets/diagram-viewer').then((m) => ({
    default: m.DiagramViewer,
  })),
);

const PROCESSING_POLL_INTERVAL = 5000;

interface ChatPageProps {
  readonly thread: Thread;
  readonly isEmbeddingModelEnabled: boolean;
}

export default function ChatPage({
  thread: initialThread,
  isEmbeddingModelEnabled,
}: ChatPageProps) {
  const { t } = useTranslation('chat');
  const { confirm } = useConfirmation();
  const navigate = useNavigate();
  const { models, isLoading: isLoadingModels } = usePermittedModels();
  const [isStreaming, setIsStreaming] = useState(false);
  const { data: thread = initialThread } = useQuery({
    queryKey: getThreadsControllerFindOneQueryKey(initialThread.id),
    queryFn: () => threadsControllerFindOne(initialThread.id),
    initialData: initialThread,
    staleTime: 0,
    // eslint-disable-next-line sonarjs/function-return-type -- React Query's refetchInterval expects number | false
    refetchInterval: (query) => {
      // Pause polling while streaming so a poll started before stream end
      // can't land in the cache afterwards and shorten the displayed text
      // via the thread reconciliation pass.
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

  // Detect if the model used in this thread is no longer accessible.
  // Only flagged after loading completes to avoid flashing the warning.
  const isModelUnavailable = useMemo(() => {
    if (thread.permittedModelId) return !isLoadingModels && !selectedModel;
    return false;
  }, [thread.permittedModelId, selectedModel, isLoadingModels]);

  const queryClient = useQueryClient();
  const chatInputRef = useRef<ChatInputRef>(null);
  // In-flight submission, restored into the input if the run fails so the user can retry.
  const lastSubmissionRef = useRef<{ text: string; images?: File[] } | null>(
    null,
  );

  const [threadTitle, setThreadTitle] = useState<string | undefined>(
    thread.title,
  );
  const [messages, setMessages] = useState<Message[]>(thread.messages);
  const [piiMasks, setPiiMasks] = useState<PiiMaskResponseDto[]>(
    thread.piiMasks,
  );

  // Reconcile local message/title state whenever the thread reference changes
  // (navigating to another thread, or a refetch returning fresh server data).
  // Done during render rather than in an effect to avoid the extra commit pass
  // flagged by react-hooks/set-state-in-effect.
  const [reconciledThread, setReconciledThread] = useState(thread);
  if (thread !== reconciledThread) {
    setReconciledThread(thread);
    setMessages(thread.messages);
    setThreadTitle(thread.title);
    setPiiMasks(thread.piiMasks);
  }
  const [pendingSubmission, setPendingSubmission] = useState<string | null>(
    null,
  );
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const {
    openArtifact,
    isExporting,
    handleOpenArtifact,
    handleSaveArtifact,
    handleRevertArtifact,
    handleExportArtifact,
    handleCloseArtifact,
  } = useArtifactActions(thread.id);

  const { handleLetterheadChange } = useLetterheadChange({
    artifactId: openArtifact?.id ?? '',
    threadId: thread.id,
  });

  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
  }, [messages]);

  const toolResultsByToolId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const message of sortedMessages) {
      if (message.role !== 'tool') continue;
      for (const content of message.content) {
        if (content.type === 'tool_result') {
          map[content.toolId] = content.result;
        }
      }
    }
    return map;
  }, [sortedMessages]);

  const { deleteChat } = useDeleteThread({
    onSuccess: () => {
      void navigate({ to: '/chat' });
    },
    onError: (error) => {
      console.error('Failed to delete thread', error);
      showError(t('chat.errorDeleteThread'));
    },
  });

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

  const handleMessage = useCallback((message: RunMessageResponseDtoMessage) => {
    setPendingSubmission(null);
    setMessages((prev) => {
      const exists = prev.some((m) => m.id === message.id);
      if (exists) return prev.map((m) => (m.id === message.id ? message : m));
      return [...prev, message];
    });
  }, []);

  const handleMasks = useCallback((data: RunMasksResponseDto) => {
    // Events carry the thread's full dictionary — replace-by-token merge is
    // idempotent and keeps any entries from earlier events.
    setPiiMasks((prev) => {
      const byToken = new Map(prev.map((mask) => [mask.token, mask]));
      for (const mask of data.masks) {
        byToken.set(mask.token, mask);
      }
      return [...byToken.values()];
    });
  }, []);

  const handleFileUpload = (files: File[]) =>
    files.forEach((file) => createFileSource({ file }));

  const handleError = useRunErrorHandler(thread.id);

  const restoreFailedSubmission = useCallback(() => {
    const last = lastSubmissionRef.current;
    if (!last) return;
    chatInputRef.current?.restoreFailedSubmission(last.text, last.images ?? []);
  }, []);

  const handleSession = useCallback((session: RunSessionResponseDto) => {
    if (config.env === 'development') {
      // eslint-disable-next-line no-console
      console.log('session', session);
    }
    if (session.streaming === true) setIsStreaming(true);
    if (session.streaming === false) setIsStreaming(false);
  }, []);

  const handleThread = useCallback(
    (thread: RunThreadResponseDto) => {
      if (config.env === 'development') {
        // eslint-disable-next-line no-console
        console.log('Thread', thread);
      }
      setThreadTitle(thread.title);
      void queryClient.invalidateQueries({
        queryKey: getThreadsControllerFindAllQueryKey(),
      });
    },
    [queryClient],
  );

  const { sendTextMessage, abort } = useMessageSend({
    threadId: thread.id,
    onMessageEvent: (data) => handleMessage(data.message),
    onErrorEvent: handleError,
    onSessionEvent: handleSession,
    onThreadEvent: handleThread,
    onMasksEvent: handleMasks,
    onError: (error) => {
      console.error('Error in useMessageSend:', error);
      showError(t('chat.errorSendMessage'));
    },
    // Runs in the finally of every send (success or failure). Restore the
    // prompt + images on any failure — incl. the 403/429 paths that never
    // reach onError — then clear the stored submission.
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
  // want the user to wait before they can submit a message.
  const isSendDisabled = isCreatingFileSource || hasProcessingSources;

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

      // Pass files directly - they'll be uploaded as part of the multipart request
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

  function handleSendCancelled() {
    abort();
    // Cancelling is intentional: discard the saved submission so it is neither
    // restored now (abort skips onComplete) nor left stale for a later failure.
    lastSubmissionRef.current = null;
    setIsStreaming(false);
    setPendingSubmission(null);

    // Immediately remove tool calls from the last assistant message in local state
    // This provides instant feedback matching what the backend will save
    setMessages((prev) => {
      const lastMessage = prev[prev.length - 1];
      // eslint-disable-next-line eqeqeq, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-optional-chain -- guard against empty prev array where lastMessage would be undefined
      if (lastMessage != null && lastMessage.role === 'assistant') {
        // Filter out tool_use content, keeping only text and thinking
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

  function handleRenameThread(fromDropdown = false) {
    // eslint-disable-next-line sonarjs/no-selector-parameter
    if (fromDropdown) {
      // Delay to allow dropdown menu to fully close first
      setTimeout(() => setRenameDialogOpen(true), 0);
    } else {
      setRenameDialogOpen(true);
    }
  }

  const chatHeader = (
    <ChatHeader
      threadTitle={threadTitle}
      isAnonymous={thread.isAnonymous}
      onRename={handleRenameThread}
      onDelete={handleDeleteThread}
    />
  );

  const renderUnits = useMemo(
    () =>
      groupMessagesIntoRuns(sortedMessages, {
        isStreaming,
        toolResultsByToolId,
        hasPendingUserTurn: pendingSubmission !== null,
      }),
    [sortedMessages, isStreaming, toolResultsByToolId, pendingSubmission],
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
      onOpenArtifact={handleOpenArtifact}
    />
  );

  // Controls are always disabled — thread already has messages
  const chatInput = isModelUnavailable ? null : (
    <>
      <p className="text-xs text-muted-foreground text-center mb-2">
        {t('chat.inputDisclaimer')}
      </p>
      {thread.isLongChat && <LongChatWarning />}
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

  return (
    <AppLayout>
      <PiiMaskProvider masks={piiMasks}>
        <ChatInterfaceLayout
          chatHeader={chatHeader}
          chatContent={chatContent}
          chatInput={chatInput}
          resetKey={thread.id}
          sidePanel={
            openArtifact ? (
              <Suspense fallback={null}>
                {openArtifact.type === 'diagram' ? (
                  <LazyDiagramViewer
                    artifact={openArtifact}
                    onClose={handleCloseArtifact}
                  />
                ) : (
                  <LazyArtifactEditor
                    artifact={openArtifact}
                    onSave={handleSaveArtifact}
                    onRevert={handleRevertArtifact}
                    onExport={handleExportArtifact}
                    onClose={handleCloseArtifact}
                    onLetterheadChange={handleLetterheadChange}
                    isExporting={isExporting}
                  />
                )}
              </Suspense>
            ) : undefined
          }
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
