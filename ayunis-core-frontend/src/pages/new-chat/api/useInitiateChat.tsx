import { getThreadsControllerFindAllQueryKey } from '@/shared/api';
import { useChatContext } from '@/shared/contexts/chat/useChatContext';
import { useNavigate } from '@tanstack/react-router';
import { useThreadsControllerCreate } from '@/shared/api/generated/ayunisCoreAPI';
import type { CreateThreadData } from '../model/openapi';
import type { SourceResponseDtoType } from '@/shared/api';
import { useQueryClient } from '@tanstack/react-query';

export const useInitiateChat = () => {
  const { setPendingMessage, setPendingSkillId, setSources } = useChatContext();
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
        // Clear pending message and skill on error
        setPendingMessage('');
        setPendingSkillId('');
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
    // Store the message and attachments as pending so ChatPage can send them
    // Note: Images are already stored in context by ChatInput when threadId is not available
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
