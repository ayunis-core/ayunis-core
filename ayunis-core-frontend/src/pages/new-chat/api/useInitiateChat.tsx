import { useChatContext } from "@/shared/contexts/chat/useChatContext";
import { useNavigate } from "@tanstack/react-router";
import { useThreadsControllerCreate } from "@/shared/api/generated/ayunisCoreAPI";
import type { CreateThreadData } from "../model/openapi";

export const useInitiateChat = () => {
  const { setPendingMessage } = useChatContext();
  const navigate = useNavigate();

  const createThreadMutation = useThreadsControllerCreate({
    mutation: {
      onSuccess: (threadResponse) => {
        // Navigate to the new thread
        navigate({
          to: "/chats/$threadId",
          params: { threadId: threadResponse.id },
        });
      },
      onError: (error) => {
        console.error("Failed to create thread:", error);
        // Clear pending message on error
        setPendingMessage("");
      },
    },
  });

  function initiateChat(message: string, modelId?: string, agentId?: string) {
    // Store the message as pending
    setPendingMessage(message);

    // Create thread data
    const createThreadData: CreateThreadData = {
      modelId,
      agentId,
    };

    // Create the new thread
    createThreadMutation.mutate({
      data: createThreadData,
    });
  }

  return {
    initiateChat,
    isCreating: createThreadMutation.isPending,
    error: createThreadMutation.error,
  };
};
