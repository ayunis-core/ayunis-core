import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  lazy,
  Suspense,
} from 'react';
import ChatInterfaceLayout from '@/layouts/chat-interface-layout/ui/ChatInterfaceLayout';
import ChatMessage from '@/pages/chat/ui/ChatMessage';
import AssistantRunBlock from '@/pages/chat/ui/AssistantRunBlock';
import { groupMessagesIntoRuns } from '@/pages/chat/ui/agent-run-timeline';
import ChatInput from '@/widgets/chat-input';
import { useMessageSend } from '../api/useMessageSend';
import ChatHeader from './ChatHeader';
import LongChatWarning from './LongChatWarning';
import UnavailableAgentWarning from './UnavailableAgentWarning';
import type { Thread, Message } from '../model/openapi';
import { showError } from '@/shared/lib/toast';
import config from '@/shared/config';

import { useConfirmation } from '@/widgets/confirmation-modal';
import { RenameThreadDialog } from '@/widgets/rename-thread-dialog';
import { useDeleteThread } from '@/features/useDeleteThread';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import type {
  RunMessageResponseDtoMessage,
  RunSessionResponseDto,
  RunThreadResponseDto,
} from '@/shared/api';
import { SourceResponseDtoStatus } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useRunErrorHandler } from '../hooks/useRunErrorHandler';
import { useLetterheadChange } from '../hooks/useLetterheadChange';
import { usePendingMessage } from '../hooks/usePendingMessage';
import AppLayout from '@/layouts/app-layout';
import { AxiosError } from 'axios';
import type { ChatInputRef } from '@/widgets/chat-input/ui/ChatInput';
import { useCreateFileSource } from '@/pages/chat/api/useCreateFileSource';
import { useDeleteFileSource } from '../api/useDeleteFileSource';
import { useArtifactActions } from '../hooks/useArtifactActions';
import { useAgents } from '@/features/useAgents';
import { useIsAgentsEnabled } from '@/features/feature-toggles';
import { usePermittedModels } from '@/features/usePermittedModels';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import {
  getThreadsControllerFindAllQueryKey,
  getThreadsControllerFindOneQueryKey,
  threadsControllerFindOne,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useKnowledgeBaseAttachment } from '../api/useKnowledgeBaseAttachment';
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
  const isAgentsEnabled = useIsAgentsEnabled();
  const { agents, isLoading: isLoadingAgents } = useAgents({
    enabled: isAgentsEnabled,
  });
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
      // via the [thread] reconciliation effect.
      if (isStreaming) return false;
      const data = query.state.data;
      if (!data) return false;
      const hasProcessing = data.sources.some(
        (s) => s.status === SourceResponseDtoStatus.processing,
      );
      return hasProcessing ? PROCESSING_POLL_INTERVAL : false;
    },
  });

  const selectedAgent = agents.find((agent) => agent.id === thread.agentId);

  const selectedModel = models.find((m) => m.id === thread.permittedModelId);
  const isVisionEnabled = thread.agentId
    ? (selectedAgent?.model.canVision ?? false)
    : (selectedModel?.canVision ?? false);

  // Detect if the agent or model used in this thread is no longer accessible.
  // Only flagged after loading completes to avoid flashing the warning.
  const isAgentUnavailable = useMemo(() => {
    if (thread.agentId) return !isLoadingAgents && !selectedAgent;
    if (thread.permittedModelId) return !isLoadingModels && !selectedModel;
    return false;
  }, [
    thread.agentId,
    thread.permittedModelId,
    selectedAgent,
    selectedModel,
    isLoadingAgents,
    isLoadingModels,
  ]);

  const queryClient = useQueryClient();
  const chatInputRef = useRef<ChatInputRef>(null);

  const [threadTitle, setThreadTitle] = useState<string | undefined>(
    thread.title,
  );
  const [messages, setMessages] = useState<Message[]>(thread.messages);
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

  const {
    createFileSource,
    createFileSourceAsync,
    isLoading: isCreatingFileSource,
    reset: resetCreateFileSourceMutation,
  } = useCreateFileSource({
    threadId: thread.id,
  });
  const { deleteFileSource } = useDeleteFileSource({
    threadId: thread.id,
  });

  const { addKnowledgeBase, addKnowledgeBaseAsync, removeKnowledgeBase } =
    useKnowledgeBaseAttachment({ threadId: thread.id });
  const { downloadSource } = useDownloadSource(thread);

  const handleMessage = useCallback((message: RunMessageResponseDtoMessage) => {
    setMessages((prev) => {
      const exists = prev.some((m) => m.id === message.id);
      if (exists) return prev.map((m) => (m.id === message.id ? message : m));
      return [...prev, message];
    });
  }, []);

  const handleFileUpload = useCallback(
    (file: File) => {
      createFileSource({ file });
    },
    [createFileSource],
  );

  const handleError = useRunErrorHandler(thread.id);

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
    onError: (error) => {
      console.error('Error in useMessageSend:', error);
      showError(t('chat.errorSendMessage'));
    },
    onComplete: () => {
      // eslint-disable-next-line no-console
      console.log('Message sending completed');
      setIsStreaming(false);
    },
  });

  const { isProcessingPendingSources } = usePendingMessage({
    sendTextMessage,
    createFileSourceAsync,
    resetCreateFileSourceMutation,
    addKnowledgeBaseAsync,
    chatInputRef,
  });

  const isTotallyCreatingFileSource =
    isCreatingFileSource || isProcessingPendingSources;

  async function handleSend(
    message: string,
    imageFiles?: Array<{ file: File; altText?: string }>,
  ) {
    try {
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
    } catch (error) {
      chatInputRef.current?.setMessage(message);
      setIsStreaming(false);
      if (error instanceof AxiosError && error.response?.status === 403) {
        showError(t('chat.upgradeToProError'));
      } else {
        showError(t('chat.errorSendMessage'));
      }
      throw error; // rethrow the error to preserve the message
    }
  }

  function handleSendCancelled() {
    abort();
    setIsStreaming(false);

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

  useEffect(() => {
    setMessages(thread.messages);
    setThreadTitle(thread.title);
  }, [thread]);

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
      }),
    [sortedMessages, isStreaming, toolResultsByToolId],
  );

  const chatContent = (
    <div className="p-4 pb-8">
      {renderUnits.map((unit, i) => {
        if (unit.kind === 'user') {
          return <ChatMessage key={unit.key} message={unit.message} />;
        }
        const previousUnit = i > 0 ? renderUnits[i - 1] : undefined;
        const hideAvatar = previousUnit?.kind === 'agent-run';
        return (
          <AssistantRunBlock
            key={unit.key}
            unit={unit}
            hideAvatar={hideAvatar}
            threadId={thread.id}
            onOpenArtifact={handleOpenArtifact}
          />
        );
      })}
    </div>
  );

  // Controls are always disabled — thread already has messages
  const chatInput = isAgentUnavailable ? (
    <UnavailableAgentWarning />
  ) : (
    <>
      <p className="text-xs text-muted-foreground text-center mb-2">
        {t('chat.inputDisclaimer')}
      </p>
      {thread.isLongChat && <LongChatWarning />}
      <ChatInput
        key={thread.id}
        ref={chatInputRef}
        modelId={
          thread.agentId ? selectedAgent?.model.id : thread.permittedModelId
        }
        isModelChangeDisabled={true}
        isAgentChangeDisabled={true}
        isAnonymousChangeDisabled={true}
        agentId={thread.agentId}
        sources={thread.sources}
        knowledgeBases={thread.knowledgeBases}
        isAnonymous={thread.isAnonymous}
        isStreaming={isStreaming}
        isCreatingFileSource={isTotallyCreatingFileSource}
        onModelChange={() => {}}
        onAgentChange={() => {}}
        onAgentRemove={() => {}}
        onFileUpload={handleFileUpload}
        onRemoveSource={deleteFileSource}
        onDownloadSource={(sourceId) => void downloadSource(sourceId)}
        onAddKnowledgeBase={(kb) => addKnowledgeBase(kb.id)}
        onRemoveKnowledgeBase={removeKnowledgeBase}
        onSend={(m, imageFiles) => void handleSend(m, imageFiles)}
        onSendCancelled={handleSendCancelled}
        isEmbeddingModelEnabled={isEmbeddingModelEnabled}
        isVisionEnabled={isVisionEnabled}
      />
    </>
  );

  return (
    <AppLayout>
      <ChatInterfaceLayout
        chatHeader={chatHeader}
        chatContent={chatContent}
        chatInput={chatInput}
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
      <RenameThreadDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        threadId={thread.id}
        currentTitle={threadTitle ?? null}
      />
    </AppLayout>
  );
}
