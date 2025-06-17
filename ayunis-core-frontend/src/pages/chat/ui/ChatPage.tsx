import { useState, useRef, useEffect, useCallback } from "react";
import AppLayout from "@/layouts/app-layout";
import ChatInterfaceLayout from "@/layouts/chat-interface-layout/ui/ChatInterfaceLayout";
import ChatMessage from "@/pages/chat/ui/ChatMessage";
import ChatInput from "@/widgets/chat-input";
import { useChatContext } from "@/shared/contexts/chat/useChatContext";
import { useMessageEventStream } from "../api/useMessageEventStream";
import { useMessageSend } from "../api/useMessageSend";
import { useUpdateThreadModel } from "../api/useUpdateThreadModel";
import ContentAreaHeader from "@/widgets/content-area-header/ui/ContentAreaHeader";
import { MessageSquare, MoreVertical, Trash2 } from "lucide-react";
import type { Thread, Model, Message } from "../model/openapi";
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

interface ChatPageProps {
  thread: Thread;
}

export default function ChatPage({ thread: threadFromLoader }: ChatPageProps) {
  const { t } = useTranslation("chats");
  const [threadTitle, setThreadTitle] = useState<string | undefined>(
    threadFromLoader.title,
  );
  const [model, setModel] = useState<Model>(threadFromLoader.model);
  const { pendingMessage, setPendingMessage } = useChatContext();
  const [messages, setMessages] = useState<Message[]>(
    threadFromLoader.messages,
  );
  const [internetSearch, setInternetSearch] = useState(
    threadFromLoader.isInternetSearchEnabled,
  );
  const [codeExecution, setCodeExecution] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const processedPendingMessageRef = useRef<String | null>(null);

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

  useEffect(() => {
    setMessages(threadFromLoader.messages);
    setThreadTitle(threadFromLoader.title);
    setModel(threadFromLoader.model);
    setInternetSearch(threadFromLoader.isInternetSearchEnabled);
    setCodeExecution(false);
  }, [threadFromLoader]);

  // Memoize the callbacks for useMessageSend to prevent recreating the hook
  const handleSendSuccess = useCallback((data: any) => {
    console.log("success", data);
  }, []);

  const handleSendError = useCallback((error: any) => {
    showError(error.message);
  }, []);

  const { sendTextMessage } = useMessageSend({
    threadId: threadFromLoader.id,
    onSuccess: handleSendSuccess,
    onError: handleSendError,
  });

  function handleSend(message: string) {
    sendTextMessage({
      text: message,
    });
  }

  // Memoize the callback functions to prevent unnecessary reconnections
  const handleMessage = useCallback((message: any) => {
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

  const handleError = useCallback((error: any) => {
    config.env === "development" && console.log("error", error);
    showError(error.message);
  }, []);

  const handleSession = useCallback((session: any) => {
    config.env === "development" && console.log("session", session);
    if (session.streaming === true) setIsStreaming(true);
    if (session.streaming === false) setIsStreaming(false);
  }, []);

  const handleThread = useCallback((thread: any) => {
    config.env === "development" && console.log("Thread", thread);
    // reset the "thread" queryKeys from the queryClient
    setThreadTitle(thread.title);
  }, []);

  const handleConnected = useCallback(() => {
    config.env === "development" && console.log("Connected");
  }, []);

  const handleDisconnect = useCallback(() => {
    config.env === "development" && console.log("Disconnected");
  }, []);

  useMessageEventStream({
    threadId: threadFromLoader.id,
    onMessageEvent: (data) => handleMessage(data.message),
    onErrorEvent: (data) => handleError(data.message),
    onSessionEvent: (data) => handleSession(data),
    onThreadEvent: (data) => handleThread(data),
    onConnected: handleConnected,
    onDisconnect: handleDisconnect,
  });

  // Auto-scroll to bottom when new messages are added - use the local messages state
  useEffect(() => {
    if (scrollAreaRef.current) {
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

      // Scroll to bottom with a small delay to ensure content is rendered
      if (scrollContainer) {
        requestAnimationFrame(() => {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        });
      }
    }
  }, [messages]);

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

  function handleModelChange(newModel: Model) {
    setModel(newModel);
    updateModel(threadFromLoader.id, newModel).catch((error) => {
      console.error("Failed to update thread model", error);
      showError("Failed to update thread model");
    });
  }

  function handleDeleteThread() {
    confirm({
      title: t("chat.deleteThreadTitle"),
      description: t("chat.deleteThreadDescription"),
      confirmText: t("chat.deleteText"),
      cancelText: t("chat.cancelText"),
      variant: "destructive",
      onConfirm: () => deleteChat(threadFromLoader.id),
    });
  }

  // Chat Header
  const chatHeader = (
    <ContentAreaHeader
      title={threadTitle || t("chat.untitled")}
      icon={<MessageSquare className="h-5 w-5 text-primary" />}
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
        {messages
          .sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1))
          .map((message) => (
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
      model={model}
      isStreaming={isStreaming}
      onModelChange={handleModelChange}
      internetSearch={internetSearch}
      onInternetSearchChange={setInternetSearch}
      codeExecution={codeExecution}
      onCodeExecutionChange={setCodeExecution}
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
