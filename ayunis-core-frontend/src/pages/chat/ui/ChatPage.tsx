import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import ChatInterfaceLayout from "@/layouts/chat-interface-layout/ui/ChatInterfaceLayout";
import ChatMessage from "@/pages/chat/ui/ChatMessage";
import ChatInput from "@/widgets/chat-input";
import { useChatContext } from "@/shared/contexts/chat/useChatContext";
import { useMessageSend } from "../api/useMessageSend";
import { useUpdateThreadModel } from "../api/useUpdateThreadModel";
import ContentAreaHeader from "@/widgets/content-area-header/ui/ContentAreaHeader";
import { MoreVertical, Trash2 } from "lucide-react";
import type { Thread, Message } from "../model/openapi";
import { showError } from "@/shared/lib/toast";
import config from "@/shared/config";
import { Button } from "@/shared/ui/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/shadcn/dropdown-menu";
import { useConfirmation } from "@/widgets/confirmation-modal";
import { useDeleteThread } from "@/features/useDeleteThread";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useUpdateThreadAgent } from "../api/useUpdateThreadAgent";
import type {
  RunErrorResponseDto,
  RunMessageResponseDtoMessage,
  RunSessionResponseDto,
  RunThreadResponseDto,
} from "@/shared/api";
import AppLayout from "@/layouts/app-layout";
import { AxiosError } from "axios";
import type { ChatInputRef } from "@/widgets/chat-input/ui/ChatInput";
import { useCreateFileSource } from "@/pages/chat/api/useCreateFileSource";
import { useDeleteFileSource } from "../api/useDeleteFileSource";
import { useRemoveThreadAgent } from "../api/useRemoveThreadAgent";
import { useAgents } from "@/features/useAgents";
import { useQueryClient } from "@tanstack/react-query";
import { getThreadsControllerFindAllQueryKey } from "@/shared/api/generated/ayunisCoreAPI";

interface ChatPageProps {
  thread: Thread;
  isEmbeddingModelEnabled: boolean;
}

export default function ChatPage({
  thread,
  isEmbeddingModelEnabled,
}: ChatPageProps) {
  const { t } = useTranslation("chats");
  const { confirm } = useConfirmation();
  const navigate = useNavigate();
  const { agents } = useAgents();
  const selectedAgent = agents.find((agent) => agent.id === thread.agentId);
  const queryClient = useQueryClient();
  const processedPendingMessageRef = useRef<String | null>(null);
  const chatInputRef = useRef<ChatInputRef>(null);

  const { pendingMessage, setPendingMessage, sources, setSources } =
    useChatContext();
  const [threadTitle, setThreadTitle] = useState<string | undefined>(
    thread!.title,
  );
  const [messages, setMessages] = useState<Message[]>(thread!.messages);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessingPendingSources, setIsProcessingPendingSources] =
    useState(false);

  // Memoize sorted messages to avoid sorting on every render
  const sortedMessages = useMemo(() => {
    return messages.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
  }, [messages]);

  const { deleteChat } = useDeleteThread({
    onSuccess: () => {
      navigate({ to: "/chat" });
    },
    onError: (error) => {
      console.error("Failed to delete thread", error);
      showError(t("chat.errorDeleteThread"));
    },
  });

  const { updateModel } = useUpdateThreadModel({ threadId: thread.id });
  const { updateAgent } = useUpdateThreadAgent({ threadId: thread.id });
  const { removeAgent } = useRemoveThreadAgent({ threadId: thread.id });

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

  // Combine both loading states - use our local state for bulk operations
  const isTotallyCreatingFileSource =
    isCreatingFileSource || isProcessingPendingSources;

  const handleMessage = useCallback((message: RunMessageResponseDtoMessage) => {
    setMessages((prev) => {
      // Update message if exists, otherwise append
      const existing = prev.find((m) => m.id === message.id);
      if (existing) {
        return prev.map((m) => (m.id === message.id ? message : m));
      }
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

  const handleError = useCallback((error: RunErrorResponseDto) => {
    switch (error.code) {
      case "EXECUTION_ERROR":
        showError(t("chat.errorExecutionError"));
        break;
      case "RUN_NO_MODEL_FOUND":
        showError(t("chat.errorNoModelFound"));
        break;
      case "RUN_MAX_ITERATIONS_REACHED":
        showError(t("chat.errorMaxIterationsReached"));
        break;
      case "RUN_TOOL_NOT_FOUND":
        showError(t("chat.errorToolNotFound"));
        break;
      default:
        showError(t("chat.errorUnexpected"));
    }
  }, []);

  const handleSession = useCallback((session: RunSessionResponseDto) => {
    config.env === "development" && console.log("session", session);
    if (session.streaming === true) setIsStreaming(true);
    if (session.streaming === false) setIsStreaming(false);
  }, []);

  const handleThread = useCallback((thread: RunThreadResponseDto) => {
    config.env === "development" && console.log("Thread", thread);
    setThreadTitle(thread.title);
    queryClient.invalidateQueries({
      queryKey: getThreadsControllerFindAllQueryKey(),
    });
  }, []);

  const { sendTextMessage, abort } = useMessageSend({
    threadId: thread.id,
    onMessageEvent: (data) => handleMessage(data.message),
    onErrorEvent: handleError,
    onSessionEvent: handleSession,
    onThreadEvent: handleThread,
    onError: (error) => {
      console.error("Error in useMessageSend:", error);
      showError(t("chat.errorSendMessage"));
    },
    onComplete: () => {
      console.log("Message sending completed");
      setIsStreaming(false);
    },
  });

  async function handleSend(message: string) {
    try {
      setIsStreaming(true);
      chatInputRef.current?.setMessage("");

      await sendTextMessage({
        text: message,
      });
    } catch (error) {
      chatInputRef.current?.setMessage(message);
      setIsStreaming(false);
      if (error instanceof AxiosError && error.response?.status === 403) {
        showError(t("chat.upgradeToProError"));
      } else {
        showError(t("chat.errorSendMessage"));
      }
      throw error; // rethrow the error to preserve the message
    }
  }

  function handleSendCancelled() {
    abort();
    setIsStreaming(false);
  }

  useEffect(() => {
    setMessages(thread.messages);
    setThreadTitle(thread.title);
  }, [thread]);

  // Send pending message from NewChatPage if it exists
  useEffect(() => {
    async function sendPendingMessage() {
      if (
        pendingMessage &&
        // avoid sending the same message twice
        processedPendingMessageRef.current !== pendingMessage
      ) {
        processedPendingMessageRef.current = pendingMessage;
        try {
          if (sources.length > 0) {
            setIsProcessingPendingSources(true);
            await Promise.all(
              sources.map((source) =>
                createFileSourceAsync({
                  file: source.file,
                  name: source.name,
                  description: `File source: ${source.name}`,
                }),
              ),
            );
            // Reset the mutation state to ensure isPending goes to false
            resetCreateFileSourceMutation();
          }
          setSources([]);
          await sendTextMessage({
            text: pendingMessage,
          });
        } catch (error) {
          if (error instanceof AxiosError && error.response?.status === 403) {
            showError(t("chat.upgradeToProError"));
          } else {
            showError(t("chat.errorSendMessage"));
          }
          chatInputRef.current?.setMessage(pendingMessage);
        } finally {
          setIsProcessingPendingSources(false);
          setPendingMessage("");
        }
      }
    }
    sendPendingMessage();
  }, [
    pendingMessage,
    sendTextMessage,
    setPendingMessage,
    sources,
    createFileSourceAsync,
    setSources,
    chatInputRef,
    t,
    resetCreateFileSourceMutation,
  ]);

  function handleDeleteThread() {
    confirm({
      title: t("chat.deleteThreadTitle"),
      description: t("chat.deleteThreadDescription"),
      confirmText: t("chat.deleteText"),
      cancelText: t("chat.cancelText"),
      variant: "destructive",
      onConfirm: () => deleteChat(thread.id),
    });
  }

  // Chat Header
  const chatHeader = (
    <ContentAreaHeader
      title={
        <span className="inline-flex items-center gap-1">
          {threadTitle || t("chat.untitled")}
        </span>
      }
      action={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5 text-primary" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={handleDeleteThread}
              variant="destructive"
            >
              <Trash2 className="h-4 w-4" />
              <span>{t("chat.deleteThread")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    />
  );

  // Chat Content (Messages only)
  const chatContent = (
    <div className="p-4 pb-8">
      {sortedMessages.map((message, i) => (
        <ChatMessage
          key={message.id}
          message={message}
          hideAvatar={i > 0 && sortedMessages[i - 1].role !== "user"}
        />
      ))}
    </div>
  );

  // Chat Input
  const chatInput = (
    <ChatInput
      ref={chatInputRef}
      modelId={
        // If the thread has an agent, use the agent's model,
        // but disable the model selection
        // to only show the model that the agent uses
        thread.agentId ? selectedAgent?.model.id : thread.permittedModelId
      }
      isModelChangeDisabled={!!thread.agentId}
      agentId={thread.agentId}
      sources={thread.sources}
      isStreaming={isStreaming}
      isCreatingFileSource={isTotallyCreatingFileSource}
      onModelChange={updateModel}
      onAgentChange={updateAgent}
      onAgentRemove={removeAgent}
      onFileUpload={handleFileUpload}
      onRemoveSource={deleteFileSource}
      onSend={handleSend}
      onSendCancelled={handleSendCancelled}
      isEmbeddingModelEnabled={isEmbeddingModelEnabled}
    />
  );

  return (
    <AppLayout>
      <ChatInterfaceLayout
        chatHeader={chatHeader}
        chatContent={chatContent}
        chatInput={chatInput}
      />
    </AppLayout>
  );
}
