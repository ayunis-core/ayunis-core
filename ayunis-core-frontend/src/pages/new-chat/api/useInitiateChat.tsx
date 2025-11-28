import { getThreadsControllerFindAllQueryKey } from '@/shared/api';
import { useChatContext } from '@/shared/contexts/chat/useChatContext';
import { useNavigate } from '@tanstack/react-router';
import { useThreadsControllerCreate } from '@/shared/api/generated/ayunisCoreAPI';
import type { CreateThreadData } from '../model/openapi';
import type { SourceResponseDtoType } from '@/shared/api';
import { useQueryClient } from '@tanstack/react-query';

export const useInitiateChat = () => {
  const { setPendingMessage, setSources } = useChatContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createThreadMutation = useThreadsControllerCreate({
    mutation: {
      onSuccess: (threadResponse) => {
        void queryClient.invalidateQueries({
          queryKey: getThreadsControllerFindAllQueryKey(),
        });
        // Navigate to the new thread
        void navigate({
          to: '/chats/$threadId',
          params: { threadId: threadResponse.id },
        });
      },
      onError: (error) => {
        console.error('Failed to create thread:', error);
        // Clear pending message on error
        setPendingMessage('');
      },
    },
  });

  function initiateChat(
    message: string,
    modelId?: string,
    agentId?: string,
    sources?: Array<{
      id: string;
      name: string;
      type: SourceResponseDtoType;
      file: File;
    }>,
    isAnonymous?: boolean,
  ) {
    // Store the message as pending
    setPendingMessage(message);
    setSources(sources ?? []);

    // Create thread data
    const createThreadData: CreateThreadData = {
      modelId,
      agentId,
      isAnonymous,
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
