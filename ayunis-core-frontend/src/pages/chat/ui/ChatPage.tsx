import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import ChatInterfaceLayout from "@/layouts/chat-interface-layout/ui/ChatInterfaceLayout";
import ChatMessage from "@/pages/chat/ui/ChatMessage";
import ChatInput from "@/widgets/chat-input";
import { useChatContext } from "@/shared/contexts/chat/useChatContext";
import { useMessageEventStream } from "../api/useMessageEventStream";
import { useMessageSend } from "../api/useMessageSend";
import { useUpdateThreadModel } from "../api/useUpdateThreadModel";
import ContentAreaHeader from "@/widgets/content-area-header/ui/ContentAreaHeader";
import { Dot, MoreVertical, Trash2 } from "lucide-react";
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

interface ChatPageProps {
  thread: Thread;
}

export default function ChatPage({ thread }: ChatPageProps) {
  const { t } = useTranslation("chats");
  const { pendingMessage, setPendingMessage } = useChatContext();
  const [threadTitle, setThreadTitle] = useState<string | undefined>(
    thread!.title,
  );
  const [messages, setMessages] = useState<Message[]>(thread!.messages);
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<Element | null>(null);
  const processedPendingMessageRef = useRef<String | null>(null);

  // Memoize sorted messages to avoid sorting on every render
  const sortedMessages = useMemo(() => {
    return messages.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
  }, [messages]);

  const { confirm } = useConfirmation();
  const navigate = useNavigate();
  const { deleteChat } = useDeleteThread({
    onSuccess: () => {
      navigate({ to: "/chat" });
    },
    onError: (error) => {
      console.error("Failed to delete thread", error);
      showError(t("chat.errorDeleteThread"));
    },
  });

  const { updateModel } = useUpdateThreadModel();
  const { updateAgent } = useUpdateThreadAgent();

  const { sendTextMessage } = useMessageSend({
    threadId: thread.id,
  });

  async function handleSend(message: string) {
    sendTextMessage({
      text: message,
    });
  }

  // Memoize the callback functions to prevent unnecessary reconnections
  const handleMessage = useCallback((message: RunMessageResponseDtoMessage) => {
    config.env === "development" && console.log("message", message);
    setMessages((prev) => {
      // Update message if exists, otherwise append
      const existing = prev.find((m) => m.id === message.id);
      if (existing) {
        return prev.map((m) => (m.id === message.id ? message : m));
      }
      return [...prev, message];
    });
  }, []);

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
  }, []);

  const { isConnected } = useMessageEventStream({
    threadId: thread.id,
    onMessageEvent: (data) => handleMessage(data.message),
    onErrorEvent: handleError,
    onSessionEvent: handleSession,
    onThreadEvent: handleThread,
  });

  useEffect(() => {
    setMessages(thread.messages);
    setThreadTitle(thread.title);
  }, [thread]);

  // Find scroll container once and cache it
  useEffect(() => {
    if (scrollAreaRef.current && !scrollContainerRef.current) {
      // Find the scrollable parent container (likely in ChatInterfaceLayout)
      let scrollContainer = scrollAreaRef.current.closest(
        "[data-radix-scroll-area-viewport]",
      );

      // If no Radix scroll area found, try to find any scrollable parent
      if (!scrollContainer) {
        scrollContainer = scrollAreaRef.current.closest(
          ".overflow-auto, .overflow-y-auto, .overflow-scroll, .overflow-y-scroll",
        );
      }

      // If still no scrollable container found, look for the scrollable parent in the layout
      if (!scrollContainer) {
        // Look up the DOM tree for a potentially scrollable element
        let parent = scrollAreaRef.current.parentElement;
        while (parent) {
          const style = window.getComputedStyle(parent);
          if (
            style.overflowY === "auto" ||
            style.overflowY === "scroll" ||
            style.overflow === "auto" ||
            style.overflow === "scroll"
          ) {
            scrollContainer = parent;
            break;
          }
          parent = parent.parentElement;
        }
      }

      scrollContainerRef.current = scrollContainer;
    }
  }, []);

  // Auto-scroll to bottom when new messages are added - use cached scroll container
  useEffect(() => {
    if (scrollContainerRef.current) {
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop =
            scrollContainerRef.current.scrollHeight;
        }
      });
    }
  }, [sortedMessages]);

  // Send pending message from NewChatPage if it exists
  useEffect(() => {
    if (
      pendingMessage &&
      // avoid sending the same message twice
      processedPendingMessageRef.current !== pendingMessage
    ) {
      processedPendingMessageRef.current = pendingMessage;
      sendTextMessage({
        text: pendingMessage,
      });
      setPendingMessage("");
    }
  }, [pendingMessage, sendTextMessage, setPendingMessage]);

  function handleModelChange(newModelId: string) {
    updateModel(thread.id, newModelId).catch((error) => {
      console.error("Failed to update thread model", error);
      showError("Failed to update thread model");
    });
  }

  function handleAgentChange(newAgentId: string) {
    updateAgent(thread.id, newAgentId).catch((error) => {
      console.error("Failed to update thread agent", error);
      showError("Failed to update thread agent");
    });
  }

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
          <span className="">
            {isConnected ? (
              <Dot className="text-green-400 p-0" />
            ) : (
              <Dot className="text-red-400 p-0" />
            )}
          </span>
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
    <div className="p-4 pb-8" ref={scrollAreaRef}>
      <div className="space-y-4">
        {sortedMessages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {/* Loading indicator */}
        {false && <ChatMessage isLoading={true} />}
      </div>
    </div>
  );

  // Chat Input
  const chatInput = (
    <ChatInput
      modelOrAgentId={thread.agentId ?? thread.permittedModelId}
      isStreaming={isStreaming}
      onModelChange={handleModelChange}
      onAgentChange={handleAgentChange}
      onSend={handleSend}
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
