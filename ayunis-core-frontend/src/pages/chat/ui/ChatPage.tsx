import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ChatInterfaceLayout from '@/layouts/chat-interface-layout/ui/ChatInterfaceLayout';
import ChatMessage from '@/pages/chat/ui/ChatMessage';
import StreamingLoadingIndicator from '@/pages/chat/ui/StreamingLoadingIndicator';
import ChatInput from '@/widgets/chat-input';
import { useChatContext } from '@/shared/contexts/chat/useChatContext';
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
import { useRunErrorHandler } from '../hooks/useRunErrorHandler';
import AppLayout from '@/layouts/app-layout';
import { AxiosError } from 'axios';
import type { ChatInputRef } from '@/widgets/chat-input/ui/ChatInput';
import { useCreateFileSource } from '@/pages/chat/api/useCreateFileSource';
import { useDeleteFileSource } from '../api/useDeleteFileSource';
import { useAgents } from '@/features/useAgents';
import { useIsAgentsEnabled } from '@/features/feature-toggles';
import { usePermittedModels } from '@/features/usePermittedModels';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import {
  getThreadsControllerFindAllQueryKey,
  getThreadsControllerFindOneQueryKey,
  threadsControllerFindOne,
  threadsControllerDownloadSource,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useKnowledgeBaseAttachment } from '../api/useKnowledgeBaseAttachment';
import type { PendingImage } from '../api/useMessageSend';

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
  const { data: thread = initialThread } = useQuery({
    queryKey: getThreadsControllerFindOneQueryKey(initialThread.id),
    queryFn: () => threadsControllerFindOne(initialThread.id),
    initialData: initialThread,
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
  const processedPendingMessageRef = useRef<string | null>(null);
  const chatInputRef = useRef<ChatInputRef>(null);

  const {
    pendingMessage,
    setPendingMessage,
    sources,
    setSources,
    pendingImages,
    setPendingImages,
    pendingKnowledgeBases,
    setPendingKnowledgeBases,
  } = useChatContext();
  const [threadTitle, setThreadTitle] = useState<string | undefined>(
    thread.title,
  );
  const [messages, setMessages] = useState<Message[]>(thread.messages);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessingPendingSources, setIsProcessingPendingSources] =
    useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);

  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
  }, [messages]);

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

  const isTotallyCreatingFileSource =
    isCreatingFileSource || isProcessingPendingSources;

  const handleMessage = useCallback((message: RunMessageResponseDtoMessage) => {
    setMessages((prev) => {
      const exists = prev.some((m) => m.id === message.id);
      if (exists) return prev.map((m) => (m.id === message.id ? message : m));
      return [...prev, message];
    });
  }, []);

  const handleFileUpload = useCallback(
    (file: File) => {
      createFileSource({
        file,
        name: file.name,
        description: `File source: ${file.name}`,
      });
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

  async function handleDownloadSource(sourceId: string) {
    try {
      // Call the download endpoint
      const blob = await threadsControllerDownloadSource(thread.id, sourceId);

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Find the source to get its name
      const source = thread.sources.find((s) => s.id === sourceId);
      link.download = source?.name ?? 'download.csv';

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download source', error);
      showError(t('chat.errorDownloadSource'));
    }
  }

  useEffect(() => {
    setMessages(thread.messages);
    setThreadTitle(thread.title);
  }, [thread]);

  // Send pending message from NewChatPage if it exists
  useEffect(() => {
    async function uploadPendingSources() {
      if (sources.length === 0) return;
      setIsProcessingPendingSources(true);
      const promises = sources.map((source) =>
        createFileSourceAsync({
          file: source.file,
          name: source.name,
          description: `File source: ${source.name}`,
        }),
      );
      await Promise.all(promises as Promise<unknown>[]);
      resetCreateFileSourceMutation();
    }

    async function attachPendingKnowledgeBases() {
      if (pendingKnowledgeBases.length === 0) return;
      const results = await Promise.allSettled(
        pendingKnowledgeBases.map((kb) => addKnowledgeBaseAsync(kb.id)),
      );
      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length > 0) {
        console.error(
          `Failed to attach ${String(failed.length)} knowledge base(s)`,
        );
      }
    }

    function buildPendingImages(): PendingImage[] | undefined {
      if (pendingImages.length === 0) return undefined;
      return pendingImages.map((img) => ({
        file: img.file,
        altText: img.altText ?? (img.file.name || 'Pasted image'),
      }));
    }

    async function sendPendingMessage() {
      if (
        !pendingMessage ||
        processedPendingMessageRef.current === pendingMessage
      ) {
        return;
      }
      processedPendingMessageRef.current = pendingMessage;
      try {
        await uploadPendingSources();
        setSources([]);
        await attachPendingKnowledgeBases();
        await sendTextMessage({
          text: pendingMessage,
          images: buildPendingImages(),
        });
      } catch (error) {
        if (error instanceof AxiosError && error.response?.status === 403) {
          showError(t('chat.upgradeToProError'));
        } else {
          showError(t('chat.errorSendMessage'));
        }
        chatInputRef.current?.setMessage(pendingMessage);
      } finally {
        setIsProcessingPendingSources(false);
        setPendingMessage('');
        setPendingImages([]);
        setPendingKnowledgeBases([]);
      }
    }
    void sendPendingMessage();
  }, [
    pendingMessage,
    sendTextMessage,
    setPendingMessage,
    sources,
    createFileSourceAsync,
    setSources,
    pendingImages,
    setPendingImages,
    pendingKnowledgeBases,
    setPendingKnowledgeBases,
    addKnowledgeBaseAsync,
    chatInputRef,
    t,
    resetCreateFileSourceMutation,
  ]);

  const chatHeader = (
    <ChatHeader
      threadTitle={threadTitle}
      isAnonymous={thread.isAnonymous}
      onRename={handleRenameThread}
      onDelete={handleDeleteThread}
    />
  );

  // Show loading indicator when streaming and no assistant content has arrived yet
  const lastMessage = sortedMessages[sortedMessages.length - 1];
  /* eslint-disable eqeqeq, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-optional-chain -- lastMessage may be undefined if sortedMessages is empty; content may be undefined during streaming even if typed as required */
  const lastAssistantHasEmptyContent =
    lastMessage != null &&
    lastMessage.role === 'assistant' &&
    (lastMessage.content == null || lastMessage.content.length === 0);
  const showLoadingMessage =
    isStreaming &&
    (lastMessage == null ||
      lastMessage.role !== 'assistant' ||
      lastAssistantHasEmptyContent);
  /* eslint-enable eqeqeq, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-optional-chain */

  const chatContent = (
    <div className="p-4 pb-8">
      {sortedMessages.map((message, i) => (
        <ChatMessage
          key={message.id}
          message={message}
          hideAvatar={i > 0 && sortedMessages[i - 1].role !== 'user'}
          isStreaming={
            isStreaming &&
            i === sortedMessages.length - 1 &&
            message.role === 'assistant'
          }
        />
      ))}
      {showLoadingMessage && <StreamingLoadingIndicator />}
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
        onDownloadSource={(sourceId) => void handleDownloadSource(sourceId)}
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
