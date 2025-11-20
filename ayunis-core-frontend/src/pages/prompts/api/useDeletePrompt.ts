import {
  usePromptsControllerDelete,
  getPromptsControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useQueryClient } from '@tanstack/react-query';

export function useDeletePrompt() {
  const queryClient = useQueryClient();

  return usePromptsControllerDelete({
    mutation: {
      onSettled: () => {
        // Invalidate and refetch prompts list
        void queryClient.invalidateQueries({
          queryKey: getPromptsControllerFindAllQueryKey(),
        });
      },
    },
  });
}
